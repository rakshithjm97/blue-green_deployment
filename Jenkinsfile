pipeline {
    agent any

    tools {
        nodejs 'nodejs'
    }

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['blue', 'green'], description: 'Choose which environment to deploy: Blue or Green')
        choice(name: 'DOCKER_TAG', choices: ['blue', 'green'], description: 'Choose the Docker image tag for the deployment')
        booleanParam(name: 'SWITCH_TRAFFIC', defaultValue: false, description: 'Switch traffic between Blue and Green')
    }

    environment {
        SCANNER_HOME = tool 'sonar-scanner'
        TAG = "${params.DOCKER_TAG}"
        KUBE_NAMESPACE = 'webapps'
        AWS_ACCOUNT_ID = credentials('ACCOUNT_ID')
        AWS_ECR_FRONTEND_REPO_NAME = credentials('ECR_REPO1')
        AWS_ECR_BACKEND_REPO_NAME = credentials('ECR_REPO2')
        AWS_DEFAULT_REGION = 'us-east-1'
        REPOSITORY_URI = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/"
        NVD_API_KEY = credentials('nvd-api-key')
    }

    stages {
        stage('Cleaning Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Checkout from Git') {
            steps {
                git branch: 'main', credentialsId: 'GITHUB', url: 'https://github.com/gyenoch/Blue-Green-Deployment.git'
            }
        }

        stage('Code Analysis') {
            parallel {
                stage('Sonarqube Frontend Code Analysis') {
                    steps {
                        dir('Application-Code/frontend') {
                            withSonarQubeEnv('sonar-server') {
                                sh '''
                                $SCANNER_HOME/bin/sonar-scanner \
                                -Dsonar.projectName=frontend \
                                -Dsonar.projectKey=frontend
                                '''
                            }
                        }
                    }
                }

                stage('Sonarqube Backend Code Analysis') {
                    steps {
                        dir('Application-Code/backend') {
                            withSonarQubeEnv('sonar-server') {
                                sh '''
                                $SCANNER_HOME/bin/sonar-scanner \
                                -Dsonar.projectName=backend \
                                -Dsonar.projectKey=backend
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Quality Check') {
            steps {
                script {
                    waitForQualityGate abortPipeline: true, credentialsId: 'sonar-token'
                }
            }
        }

        stage('Security Scans') {
            parallel {
                stage('OWASP Frontend Dependency-Check') {
                    steps {
                        dir('Application-Code/frontend') {
                            dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit --nvdApiKey ${NVD_API_KEY}', odcInstallation: 'DP-Check'
                            dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
                        }
                    }
                }

                stage('OWASP Backend Dependency-Check') {
                    steps {
                        dir('Application-Code/backend') {
                            dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit --nvdApiKey ${NVD_API_KEY}', odcInstallation: 'DP-Check'
                            dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
                        }
                    }
                }

                stage('Trivy File Scans') {
                    steps {
                        parallel {
                            stage('Trivy Frontend File Scan') {
                                steps {
                                    dir('Application-Code/frontend') {
                                        sh 'trivy fs . > trivyfs.txt'
                                        script {
                                            def scanResults = readFile('trivyfs.txt')
                                            if (scanResults.contains('CRITICAL')) {
                                                error("Critical vulnerabilities found in frontend file scan!")
                                            }
                                        }
                                    }
                                }
                            }

                            stage('Trivy Backend File Scan') {
                                steps {
                                    dir('Application-Code/backend') {
                                        sh 'trivy fs . > trivyfs.txt'
                                        script {
                                            def scanResults = readFile('trivyfs.txt')
                                            if (scanResults.contains('CRITICAL')) {
                                                error("Critical vulnerabilities found in backend file scan!")
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Build and Push Docker Images') {
            parallel {
                stage("Build and Push Frontend Docker Image") {
                    steps {
                        dir('Application-Code/frontend') {
                            sh 'docker system prune -f'
                            sh 'docker container prune -f'
                            sh 'docker build -t ${AWS_ECR_FRONTEND_REPO_NAME}:${TAG} .'
                            sh 'aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin ${REPOSITORY_URI}'
                            sh 'docker push ${REPOSITORY_URI}${AWS_ECR_FRONTEND_REPO_NAME}:${TAG}'
                        }
                    }
                }

                stage("Build and Push Backend Docker Image") {
                    steps {
                        dir('Application-Code/backend') {
                            sh 'docker system prune -f'
                            sh 'docker container prune -f'
                            sh 'docker build -t ${AWS_ECR_BACKEND_REPO_NAME}:${TAG} .'
                            sh 'aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin ${REPOSITORY_URI}'
                            sh 'docker push ${REPOSITORY_URI}${AWS_ECR_BACKEND_REPO_NAME}:${TAG}'
                        }
                    }
                }
            }
        }

        stage("TRIVY Image Scan") {
            parallel {
                stage('Frontend Docker Image Scan') {
                    steps {
                        sh 'trivy image ${REPOSITORY_URI}${AWS_ECR_FRONTEND_REPO_NAME}:${TAG} > trivyimage.txt'
                        script {
                            def scanResults = readFile('trivyimage.txt')
                            if (scanResults.contains('CRITICAL')) {
                                error("Critical vulnerabilities found in frontend image scan!")
                            }
                        }
                    }
                }

                stage('Backend Docker Image Scan') {
                    steps {
                        sh 'trivy image ${REPOSITORY_URI}${AWS_ECR_BACKEND_REPO_NAME}:${TAG} > trivyimage.txt'
                        script {
                            def scanResults = readFile('trivyimage.txt')
                            if (scanResults.contains('CRITICAL')) {
                                error("Critical vulnerabilities found in backend image scan!")
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy MongoDB and Service') {
            steps {
                dir('Kubernetes-Manifests-file') {
                    withKubeConfig(caCertificate: '', clusterName: 'devopsshack-cluster', credentialsId: 'k8-cred', namespace: 'webapps') {
                        sh "kubectl apply -f Database -n ${KUBE_NAMESPACE}"
                    }
                }
            }
        }

        stage('Deploy Frontend & Backend Services') {
            steps {
                dir('Kubernetes-Manifests-file/Service') {
                    withKubeConfig(caCertificate: '', clusterName: 'devopsshack-cluster', credentialsId: 'k8-cred', namespace: 'webapps') {
                        sh '''
                        kubectl apply -f backend-svc.yml --force -n ${KUBE_NAMESPACE}
                        kubectl apply -f frontend-svc.yml --force -n ${KUBE_NAMESPACE}
                        sleep 20
                        '''
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                dir('Kubernetes-Manifests-file/Deployment') {
                    script {
                        def deploymentFrontend = (params.DEPLOY_ENV == 'blue') ? 'frontend-deployment-blue.yml' : 'frontend-deployment-green.yml'
                        def deploymentBackend = (params.DEPLOY_ENV == 'blue') ? 'backend-deployment-blue.yml' : 'backend-deployment-green.yml'

                        withKubeConfig(caCertificate: '', clusterName: 'devopsshack-cluster', credentialsId: 'k8-cred', namespace: 'webapps') {
                            sh "kubectl apply -f ${deploymentBackend} --record -n ${KUBE_NAMESPACE}"
                            sh "kubectl apply -f ${deploymentFrontend} --record -n ${KUBE_NAMESPACE}"
                            sh "sleep 20"
                        }
                    }
                }
            }
        }

        stage('Switch Traffic Between Blue & Green Environment') {
            when {
                expression { return params.SWITCH_TRAFFIC }
            }
            steps {
                script {
                    def newEnv = params.DEPLOY_ENV

                    withKubeConfig(caCertificate: '', clusterName: 'devopsshack-cluster', credentialsId: 'k8-cred', namespace: 'webapps') {
                        sh """
                        kubectl patch svc backend-svc -p '{"spec": {"selector": {"app": "backend", "version": "${newEnv}"}}}' -n ${KUBE_NAMESPACE}
                        kubectl patch svc frontend-svc -p '{"spec": {"selector": {"app": "frontend", "version": "${newEnv}"}}}' -n ${KUBE_NAMESPACE}
                        """
                    }
                    echo "Traffic has been switched successfully to the ${newEnv} environment"
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}