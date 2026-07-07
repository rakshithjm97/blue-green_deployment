pipeline {
    agent any

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['blue', 'green'], description: 'Choose which environment to deploy: blue or green')
        choice(name: 'DOCKER_TAG', choices: ['blue', 'green'], description: 'Choose the Docker image tag for deployment')
        booleanParam(name: 'SWITCH_TRAFFIC', defaultValue: false, description: 'Switch traffic between blue and green')
    }

    environment {
        SONAR_SCANNER_HOME = tool 'sonar-scanner'
        PATH = "${SONAR_SCANNER_HOME}/bin:${PATH}"
        TAG = "${params.DOCKER_TAG}"
        KUBE_NAMESPACE = 'webapps'
        AWS_ACCOUNT_ID = credentials('ACCOUNT_ID')
        AWS_ECR_FRONTEND_REPO_NAME = 'ecr_repo01'
        AWS_ECR_BACKEND_REPO_NAME = 'ecr_repo02'
        AWS_DEFAULT_REGION = 'ap-south-1'
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
                git branch: 'main', url: 'https://github.com/rakshithjm97/blue-green_deployment.git'
            }
        }

        

        stage('Code analysis') {
            stages {
                stage('SonarQube frontend analysis') {
                    steps {
                        dir('frontend') {
                            withSonarQubeEnv('sonar-server') {
                                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                                    sh '''
                                        sonar-scanner \
                                        -Dsonar.projectName=frontend \
                                        -Dsonar.projectKey=frontend \
                                        -Dsonar.sources=. \
                                        -Dsonar.host.url=$SONAR_HOST_URL \
                                        -Dsonar.token=$SONAR_TOKEN
                                    '''
                                }
                            }
                        }
                    }
                }

                stage('SonarQube frontend quality gate') {
                    steps {
                        timeout(time: 30, unit: 'MINUTES') {
                            withSonarQubeEnv('sonar-server') {
                                waitForQualityGate abortPipeline: false, credentialsId: 'sonar-token'
                            }
                        }
                    }
                }

                stage('SonarQube backend analysis') {
                    steps {
                        dir('backend') {
                            withSonarQubeEnv('sonar-server') {
                                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                                    sh '''
                                        sonar-scanner \
                                        -Dsonar.projectName=backend \
                                        -Dsonar.projectKey=backend \
                                        -Dsonar.sources=. \
                                        -Dsonar.host.url=$SONAR_HOST_URL \
                                        -Dsonar.token=$SONAR_TOKEN
                                    '''
                                }
                            }
                        }
                    }
                }

                stage('SonarQube backend quality gate') {
                    steps {
                        timeout(time: 30, unit: 'MINUTES') {
                            withSonarQubeEnv('sonar-server') {
                                waitForQualityGate abortPipeline: false, credentialsId: 'sonar-token'
                            }
                        }
                    }
                }
            }
        }

        stage('Dependency scan') {
            steps {
                dir('frontend') {
                    catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                        dependencyCheck additionalArguments: "--scan . --disableYarnAudit --disableNodeAudit --nvdApiKey ${NVD_API_KEY} --noupdate",
                            odcInstallation: 'DP-Check',
                            failOnError: false
                        dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
                    }
                }

                dir('backend') {
                    catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                        dependencyCheck additionalArguments: "--scan . --nvdApiKey ${NVD_API_KEY} --noupdate",
                            odcInstallation: 'DP-Check',
                            failOnError: false
                        dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
                    }
                }
            }
        }

        stage('Trivy file scan') {
            parallel {
                stage('Trivy frontend file scan') {
                    steps {
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

                stage('Trivy backend file scan') {
                    steps {
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

        stage('Build and push docker images') {
            parallel {
                stage('Build and push frontend image') {
                    steps {
                        withCredentials([aws(accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY', credentialsId: 'aws-credentials')]) {
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
                            sh '''
                                docker build -t ${AWS_ECR_FRONTEND_REPO_NAME}:${TAG} -f ./frontend/Dockerfile ./frontend
                                REPOSITORY_URL=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
                                docker tag ${AWS_ECR_FRONTEND_REPO_NAME}:${TAG} $REPOSITORY_URL/${AWS_ECR_FRONTEND_REPO_NAME}:${TAG}
                                aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin $REPOSITORY_URL
                                docker push $REPOSITORY_URL/${AWS_ECR_FRONTEND_REPO_NAME}:${TAG}
                            '''
                        }
                    }
                }

                stage('Build and push backend image') {
                    steps {
                        withCredentials([aws(accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY', credentialsId: 'aws-credentials')]) {
                            sh '''
                                docker build -t ${AWS_ECR_BACKEND_REPO_NAME}:${TAG} -f ./backend/Dockerfile ./backend
                                REPOSITORY_URL=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
                                docker tag ${AWS_ECR_BACKEND_REPO_NAME}:${TAG} $REPOSITORY_URL/${AWS_ECR_BACKEND_REPO_NAME}:${TAG}
                                aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin $REPOSITORY_URL
                                docker push $REPOSITORY_URL/${AWS_ECR_BACKEND_REPO_NAME}:${TAG}
                            '''
                        }
                    }
                }
            }
        }

        stage('Trivy image scan') {
            parallel {
                stage('Frontend docker image scan') {
                    steps {
                        withCredentials([aws(accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY', credentialsId: 'aws-credentials')]) {
                            sh '''
                                REPOSITORY_URL=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
                                aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin $REPOSITORY_URL
                                trivy image $REPOSITORY_URL/${AWS_ECR_FRONTEND_REPO_NAME}:${TAG} > trivyimage-frontend.txt
                            '''
                        }
                        script {
                            def scanResults = readFile('trivyimage-frontend.txt')
                            echo "Frontend scan results:\n${scanResults}"
                        }
                    }
                }

                stage('Backend docker image scan') {
                    steps {
                        withCredentials([aws(accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY', credentialsId: 'aws-credentials')]) {
                            sh '''
                                REPOSITORY_URL=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
                                aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin $REPOSITORY_URL
                                trivy image $REPOSITORY_URL/${AWS_ECR_BACKEND_REPO_NAME}:${TAG} > trivyimage-backend.txt
                            '''
                        }
                        script {
                            def scanResults = readFile('trivyimage-backend.txt')
                            echo "Backend scan results:\n${scanResults}"
                        }
                    }
                }
            }
        }

        stage('Deploy MongoDB and service') {
            steps {
                withCredentials([aws(accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY', credentialsId: 'aws-credentials')]) {
                    dir('Kubernetes-Manifests-file') {
                        sh 'aws eks update-kubeconfig --name bg-cluster --region ${AWS_DEFAULT_REGION}'
                        sh 'kubectl apply -f Database -n ${KUBE_NAMESPACE}'
                    }
                }
            }
        }

        stage('Deploy Frontend and Backend Services') {
            steps {
                withCredentials([aws(accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY', credentialsId: 'aws-credentials')]) {
                    dir('Kubernetes-Manifests-file/Service') {
                        sh '''
                            aws eks update-kubeconfig --name bg-cluster --region ${AWS_DEFAULT_REGION}
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
                withCredentials([aws(accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY', credentialsId: 'aws-credentials')]) {
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

                            sh 'aws eks update-kubeconfig --name bg-cluster --region ${AWS_DEFAULT_REGION}'
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
                withCredentials([aws(accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY', credentialsId: 'aws-credentials')]) {
                    script {
                        def newEnv = params.DEPLOY_ENV

                        sh """
                            aws eks update-kubeconfig --name bg-cluster --region ${AWS_DEFAULT_REGION}
                            kubectl patch svc backend-svc -p '{\"spec\":{\"selector\":{\"app\":\"backend\",\"version\":\"${newEnv}\"}}}' -n ${KUBE_NAMESPACE}
                            kubectl patch svc frontend-svc -p '{\"spec\":{\"selector\":{\"app\":\"frontend\",\"version\":\"${newEnv}\"}}}' -n ${KUBE_NAMESPACE}
                        """
                    }
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                withCredentials([aws(accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY', credentialsId: 'aws-credentials')]) {
                    script {
                        def verifyEnv = params.DEPLOY_ENV

                        sh '''
                            aws eks update-kubeconfig --name bg-cluster --region ${AWS_DEFAULT_REGION}
                            kubectl get pods -l version=${verifyEnv} -n ${KUBE_NAMESPACE}
                            kubectl get svc backend-svc -n ${KUBE_NAMESPACE}
                            kubectl get svc frontend-svc -n ${KUBE_NAMESPACE}
                        '''
                    }
                }
            }
        }
    }
}

