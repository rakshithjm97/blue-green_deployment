pipeline {
    agent any

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['blue', 'green'], description: 'Choose which environment to deploy: blue or green')
        choice(name: 'DOCKER_TAG', choices: ['blue', 'green'], description: 'Choose the Docker image tag for deployment')
        booleanParam(name: 'SWITCH_TRAFFIC', defaultValue: false, description: 'Switch traffic between blue and green')
    }

    environment {
        
        TAG = "${params.DOCKER_TAG}"
        KUBE_NAMESPACE = 'webapps'
        AWS_ACCOUNT_ID = credentials('ACCOUNT_ID')
        AWS_ECR_FRONTEND_REPO_NAME = 'ECR_REPO01'
        AWS_ECR_BACKEND_REPO_NAME = 'ECR_REPO02'
        AWS_DEFAULT_REGION = 'ap-south-1'
        REPOSITORY_URL = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
        NVD_API_KEY = credentials('mvd-api-key')
    }

    stages {
        stage('Cleaning workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Checkout from git') {
            steps {
                git branch: 'main', credentialsId: 'GITHUB', url: 'https://github.com/rakshithjm97/blue-green_deployment.git'
            }
        }

        stage('Code analysis') {
            parallel {
                stage('SonarQube frontend analysis') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            dir('frontend') {
                                withSonarQubeEnv('sonar-server') {
                                    sh '''
                                        sonar-scanner \
                                        -Dsonar.projectName=frontend \
                                        -Dsonar.projectKey=frontend \
                                        -Dsonar.sources=.
                                    '''
                                }
                            }
                        }
                    }
                }

                stage('SonarQube backend analysis') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            dir('backend') {
                                withSonarQubeEnv('sonar-server') {
                                    sh '''
                                        sonar-scanner \
                                        -Dsonar.projectName=backend \
                                        -Dsonar.projectKey=backend \
                                        -Dsonar.sources=.
                                    '''
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Quality check') {
            parallel {
                stage('Frontend quality check') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            timeout(time: 5, unit: 'MINUTES') {
                                waitForQualityGate abortPipeline: false, credentialsId: 'sonar-token'
                            }
                        }
                    }
                }

                stage('Backend quality check') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            timeout(time: 5, unit: 'MINUTES') {
                                waitForQualityGate abortPipeline: false, credentialsId: 'sonar-token'
                            }
                        }
                    }
                }
            }
        }

        stage('Dependency scan') {
            parallel {
                stage('OWASP frontend dependency check') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            dir('frontend') {
                                dependencyCheck additionalArguments: "--scan . --disableYarnAudit --disableNodeAudit --nvdApiKey ${NVD_API_KEY}",
                                    odcInstallation: 'DP-Check'
                                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
                            }
                        }
                    }
                }

                stage('OWASP backend dependency check') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            dir('backend') {
                                dependencyCheck additionalArguments: "--scan . --nvdApiKey ${NVD_API_KEY}",
                                    odcInstallation: 'DP-Check'
                                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
                            }
                        }
                    }
                }
            }
        }

        stage('Trivy file scan') {
            parallel {
                stage('Trivy frontend file scan') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            dir('frontend') {
                                sh 'trivy fs . > trivyfs.txt'
                                script {
                                    def scanResults = readFile('trivyfs.txt')
                                    if (scanResults.contains('CRITICAL')) {
                                        echo 'Warning: critical vulnerability found in frontend files'
                                    }
                                }
                            }
                        }
                    }
                }

                stage('Trivy backend file scan') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            dir('backend') {
                                sh 'trivy fs . > trivyfs.txt'
                                script {
                                    def scanResults = readFile('trivyfs.txt')
                                    if (scanResults.contains('CRITICAL')) {
                                        echo 'Warning: critical vulnerability found in backend files'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Build and push docker images') {
            parallel {
                stage('Build and push frontend image') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh '''
                                USED_DISK_SPACE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
                                if [ "$USED_DISK_SPACE" -gt 80 ]; then
                                    echo "Disk space is above 80%, running docker prune"
                                    docker system prune -f
                                    docker container prune -f
                                else
                                    echo "Disk space is below 80%, skipping prune"
                                fi
                            '''
                            sh 'docker build -t ${AWS_ECR_FRONTEND_REPO_NAME}:${TAG} -f ./frontend/Dockerfile ./frontend'
                            sh 'docker tag ${AWS_ECR_FRONTEND_REPO_NAME}:${TAG} ${REPOSITORY_URL}/${AWS_ECR_FRONTEND_REPO_NAME}:${TAG}'
                            sh 'aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin ${REPOSITORY_URL}'
                            sh 'docker push ${REPOSITORY_URL}/${AWS_ECR_FRONTEND_REPO_NAME}:${TAG}'
                        }
                    }
                }

                stage('Build and push backend image') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh 'docker build -t ${AWS_ECR_BACKEND_REPO_NAME}:${TAG} -f ./backend/Dockerfile ./backend'
                            sh 'docker tag ${AWS_ECR_BACKEND_REPO_NAME}:${TAG} ${REPOSITORY_URL}/${AWS_ECR_BACKEND_REPO_NAME}:${TAG}'
                            sh 'aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin ${REPOSITORY_URL}'
                            sh 'docker push ${REPOSITORY_URL}/${AWS_ECR_BACKEND_REPO_NAME}:${TAG}'
                        }
                    }
                }
            }
        }

        stage('Trivy image scan') {
            parallel {
                stage('Frontend docker image scan') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh 'trivy image ${REPOSITORY_URL}/${AWS_ECR_FRONTEND_REPO_NAME}:${TAG} > trivyimage-frontend.txt'
                            script {
                                def scanResults = readFile('trivyimage-frontend.txt')
                                echo "Frontend scan results:\n${scanResults}"
                            }
                        }
                    }
                }

                stage('Backend docker image scan') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh 'trivy image ${REPOSITORY_URL}/${AWS_ECR_BACKEND_REPO_NAME}:${TAG} > trivyimage-backend.txt'
                            script {
                                def scanResults = readFile('trivyimage-backend.txt')
                                echo "Backend scan results:\n${scanResults}"
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy MongoDB and service') {
            steps {
                dir('Kubernetes-Manifests-file') {
                    withKubeConfig(caCertificate: '', clusterName: 'bg-cluster', credentialsId: 'k8-cred', namespace: 'webapps', restrictKubeConfigAccess: false, serverUrl: 'https://EFCD6C924B0CADA4EF47D2E578265EFC.gr7.us-east-1.eks.amazonaws.com') {
                        sh 'aws eks update-kubeconfig --name bg-cluster --region ${AWS_DEFAULT_REGION}'
                        sh 'kubectl apply -f Database -n ${KUBE_NAMESPACE}'
                    }
                }
            }
        }

        stage('Deploy Frontend and Backend Services') {
            steps {
                dir('Kubernetes-Manifests-file/Service') {
                    withKubeConfig(caCertificate: '', clusterName: 'bg-cluster', credentialsId: 'k8-cred', namespace: 'webapps', restrictKubeConfigAccess: false, serverUrl: 'https://EFCD6C924B0CADA4EF47D2E578265EFC.gr7.us-east-1.eks.amazonaws.com') {
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
                        def deploymentFrontend = ''
                        def deploymentBackend = ''

                        if (params.DEPLOY_ENV == 'blue') {
                            deploymentFrontend = 'frontend-deployment-blue.yml'
                            deploymentBackend = 'backend-deployment-blue.yml'
                        } else {
                            deploymentFrontend = 'frontend-deployment-green.yml'
                            deploymentBackend = 'backend-deployment-green.yml'
                        }

                        withKubeConfig(caCertificate: '', clusterName: 'bg-cluster', credentialsId: 'k8-cred', namespace: 'webapps', restrictKubeConfigAccess: false, serverUrl: 'https://EFCD6C924B0CADA4EF47D2E578265EFC.gr7.us-east-1.eks.amazonaws.com') {
                            sh "kubectl apply -f ${deploymentBackend} --record -n ${KUBE_NAMESPACE}"
                            sh "kubectl apply -f ${deploymentFrontend} --record -n ${KUBE_NAMESPACE}"
                            sh 'sleep 20'
                        }
                    }
                }
            }
        }

        stage('Switch Traffic Between Blue and Green Environment') {
            when {
                expression { return params.SWITCH_TRAFFIC }
            }

            steps {
                script {
                    def newEnv = params.DEPLOY_ENV

                    withKubeConfig(caCertificate: '', clusterName: 'bg-cluster', credentialsId: 'k8-cred', namespace: 'webapps', restrictKubeConfigAccess: false, serverUrl: 'https://EFCD6C924B0CADA4EF47D2E578265EFC.gr7.us-east-1.eks.amazonaws.com') {
                        sh """
                            kubectl patch svc backend-svc -p '{"spec": {"selector": {"app": "backend", "version": "${newEnv}"}}}' -n ${KUBE_NAMESPACE}
                            kubectl patch svc frontend-svc -p '{"spec": {"selector": {"app": "frontend", "version": "${newEnv}"}}}' -n ${KUBE_NAMESPACE}
                        """
                    }

                    echo "Traffic has been switched successfully to the ${newEnv} environment"
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    def verifyEnv = params.DEPLOY_ENV

                    withKubeConfig(caCertificate: '', clusterName: 'bg-cluster', credentialsId: 'k8-cred', namespace: 'webapps', restrictKubeConfigAccess: false, serverUrl: 'https://EFCD6C924B0CADA4EF47D2E578265EFC.gr7.us-east-1.eks.amazonaws.com') {
                        sh "kubectl get pods -l version=${verifyEnv} -n ${KUBE_NAMESPACE}"
                        sh 'kubectl get svc backend-svc -n ${KUBE_NAMESPACE}'
                        sh 'kubectl get svc frontend-svc -n ${KUBE_NAMESPACE}'
                    }
                }
            }
        }
    }
}
