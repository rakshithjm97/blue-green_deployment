pipeline{
    agent any
    tools{
        nodejs 'nodejs'
    }
    
    paramaters{
        choice(name: 'DEPLOY_ENV', choices: ['blue','green'], description: 'Choose which environment to deploy : Blue or Grenn')
        choice(name: 'DOCKER_TAG', actions: ['blue','green'], description: 'choose the docker image tag for deploymnet')
        booleanParm(name: 'SWITCH_TRAFFIC', defaultValue: false, description: 'Switch traffic betwen Blua and green')

    }

    environment{
        SCANNER_HOME = tool 'sonar-scanner'
        TAG = "${parm.DOCKER_TAG}"
        KUBE_NAMESPACE = 'webapps'
        AWS_ACCOUNT_ID = credentials('ACCOUNT_ID')
        AWS_ECR_FRONTEND_REPO_NAME = ('ECR_REPO01')
        AWS_ECR_BACKEND_REPO_NAME = ('ECR_REPO02')
        AWS_DEFAULT_REGION = 'ap-south-1'
        REPOSITORY_URL = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/"
        NVD_API_KEY = credential('mvd-api-key')

    }

    stages{
        stage('cleaning_workspace'){
            steps{
                cleanws()
            }
        }


        stage('Chekcout from git'){
            steps{
                git branch: 'main', credentailsID: 'GITHUB', url:'https://github.com/gyenoch/Blue-Green-Deployment.git'
            }
        }


        stage('Code analysis'){
            parllel{
                stage('sonar qube frontend analysis'){
                    steps{
                        dir('Application-Code/frontend'){
                            withSonarQubeEnv('sonar-server'){
                                sh '''
                                $SCANNER_HOME/bin/sonar-scanner \ 
                                -Dsonar.project>name=frontedn\
                                -Dsonar.projectKey=frontend
                                '''
                            }
                        }
                    }
                }
                satge('sonar qube frontend analysis'){
                    steps{
                        dir('Application-code/backend'){
                            withSonarQubeEnv('sonar-server'){
                                sh '''
                                $SCANNER_HOME/bin/sonar-scanner \ 
                                -Dsonar.project>name=backend\
                                -Dsonar.projectKey=backend
                                '''
                            }
                        }
                    }
                }

            }
        }
        satge('Quality chekc'){
            parllel{
                stage('Frontend quality chekc'){
                    steps{
                        script{
                            // Asuming front end is configured in soanr qube with diffrent project key
                            withSonarQubeEnv('sonar-server'){// Use your SonarQube server configuration here
                            waitForQualityGate abortPipeline: true, credentialID: 'sonar-token'

                            }

                        }
                    }

                }
                stage('backend quality analysis'){
                    steps{
                        script{
                            //Assumniing backend is configured with diffrent project key
                            withSonarQubeENv('sonar-server'){//use your sonarQube server configuration here
                            waitForQualityGate.abortPipeline: true, credentialID: 'sonar-token'

                            }
                        }
                    }
                }

            }
        }
        satge('Dependecey scan'){
            parllel{
                stage('OWASP Frontend dependency chekc'){
                    steps{
                        dir('Application-code'){
                            dependencyCheck additionalrguments: '--scan ./--disableYarnAudit --disableNodeAudit --nvdApiKey ${NVD_API_KEY}',
                            odcInstallation: 'DP-Check'
                            dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
                        }
                    }
                }
                satge('OWASP backend dependency chek'){
                    steps{
                        dir('Application-code'){
                            dependencyChekc additionalarguments: '--scan ./--disableYarnAudit --disableNodeAudit --nvdApikey ${NVD_API_KEY}',
                            odcInstallation: 'DP-Check'
                            dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
                        }
                    }

                }
            }

        }
        stage('trivy file scan'){
            parllel{
                stage('trivy frontend file scan'){
                    steps{
                        dir('Application-Code/frontend'){
                            sh 'trivy fs . >> trivyfs.txt'
                            script{
                                def scanResults = readFile('trivy.txt')
                                if (ScanResults.contains('CRITICAL')){
                                    echo "warning: critical error found in the file"
                                }
                            }
                        }
                    }

                }
                stage('trivy backend file scan'){
                    steps{
                        dir('Application-code/backend'){
                            sh 'trivy fr . >> trivyfs.txt'
                            scrript{
                                def scanResults = readfile('trivyfs.txt')
                                if (ScanResults.contains('CRITICAL')){
                                    echo "warning: critical error found in the file"
                                }
                            }
                        }
                    }
                }
            }
        }
        stage('Build and push docker images'){
            parllel{
                stage('docker image byild and push frontend'){
                    steps{
                        dir('Applicationcode/frontend'){
                            //conditional docker pruning
                            ssh '''
                            USED_DISK_SPACE = $ (df / | tail -1 | awk \'{print $5}'| sed \'s/%//\')
                            if [ USED_DISK_SPACE is -gt 80 ]; then 
                               echo "Disk space is abovbe 80% , running docler prune"
                               docker system prune -f
                               docker container prrune -f
                            else
                               echo "Disk space is below 80 % m skipping prune"
                            fi
                            '''
                            sh 'docker build -t ${AWS_ECR_FRONTEND_REPO_NAME}:${TAG} .'
                            sh 'docker tag ${AWS_ECR_FRONTEND_REPO_NAME}:${TAG} ${REPOSITRY_URL}${AWS_ECR_FRONTEND_REPO_NAME}:{TAG}'
                            sh 'aws ecr get-login-password -- region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin${REPOSITARY_URL} '
                            sh ' docker push ${REPOSITRY_URL}${AWS_ECR_BACKEDN_REPO_NAME}:{TAG}'

                        }
                    }
                }
                stage('docker buid and push backend'){
                    steps{
                        dir('application-code/backend'){
                            sh '''
                            sh 'docker build -t {AWS_ECR_BACKEND_NAME}:${TAG}
                            sh 'docker tag ${AWS_ECR_BACKEND_REPO_NAME}:${TAG} ${REPOSITART_URL{AWS_ECR_BACKEND_REPO_NAME}:${TAG}'
                            sh 'aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login -username aws --password-stdin${REPOSITART_URL}'
                            sh 'docker push ${REPOSITARY_URL}${AWS_ECR_BACKEND_REPO_NAME}:${TAG}'
                            '''
                        }
                    }
                }


            }
        }
        stage('TRIVY image scan'){
            parllel{
                stage('frontend docker imaeg scan'){
                    steps{
                        sh 'trivy image ${RPOSITORY_URL}${AWS_ECR_FRONTEND_REPO_NAME}:${TAG} >> trivyimage.txt'
                        script{
                            def scanResults = readfile('trivyimage.txt')
                            echo "Frotend scan results:\n${scanResluts}"

                        }

                    }

                stage('Backend docker image scan'){
                    steps{
                        sh 'trivy image ${REPOSITARY_URL}${AWS_ECR_BACKEND_REPO_NAME}:${TAG}'

                        script{
                            def scanResults = readfile('trivyimage.txt')
                            echo "Backend scan results :\${scanResults}"
                        }
                    }
                }
                }
            }
        }
        stage('Deploy MongoDB and service'){
            steps{
                dir('Kuberneter_manifes_files_2'){
                    withKubeConfig(caCertificate: '',clusterName: 'bg-cluster',credentialsId: 'k8-cred',
                    namespce: 'webapps',restrictKubeconfigAccess: false, serverul: ){
                        sh "aws eks update-kubeconfig --name bg-cluster --region ap-south-1"
                        sh "kubectl apply -f Database -n ${KUBE_NAMESPACE}"
                    }

                }
            }
        }
        stage('Deploy Frontend & Backend Services') {
            steps {
                dir('Kubernetes-Manifests-file/Service') {
                    withKubeConfig(caCertificate: '', clusterName: 'devopsshack-cluster', credentialsId: 'k8-cred', namespace: 'webapps', restrictKubeConfigAccess: false, serverUrl: 'https://EFCD6C924B0CADA4EF47D2E578265EFC.gr7.us-east-1.eks.amazonaws.com') {
                        sh '''
                        kubectl apply -f backend-svc.yml --force -n ${KUBE_NAMESPACE}
                        kubectl apply -f frontend-svc.yml --force -n ${KUBE_NAMESPACE}
                        sleep 20
                        '''
                    }
                }
            }
        }
        stage('Deploy Frontend & Backend Services') {
            steps {
                dir('Kubernetes-Manifests-file/Service') {
                    withKubeConfig(caCertificate: '', clusterName: 'devopsshack-cluster', credentialsId: 'k8-cred', namespace: 'webapps', restrictKubeConfigAccess: false, serverUrl: 'https://EFCD6C924B0CADA4EF47D2E578265EFC.gr7.us-east-1.eks.amazonaws.com') {
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
                        def deploymentFrontend = ""
                        def deploymentBackend = ""

                        if (params.DEPLOY_ENV == 'blue') {
                            deploymentFrontend = 'frontend-deployment-blue.yml'
                            deploymentBackend = 'backend-deployment-blue.yml'
                        } else {
                            deploymentFrontend = 'frontend-deployment-green.yml'
                            deploymentBackend = 'backend-deployment-green.yml'
                        }

                        withKubeConfig(caCertificate: '', clusterName: 'devopsshack-cluster', credentialsId: 'k8-cred', namespace: 'webapps', restrictKubeConfigAccess: false, serverUrl: 'https://EFCD6C924B0CADA4EF47D2E578265EFC.gr7.us-east-1.eks.amazonaws.com') {
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
                    withKubeConfig(caCertificate: '', clusterName: ' bg-cluster', contextName: '', credentialsId: 'k8-cred', namespace: 'webapps', restrictKubeConfigAccess: false, serverUrl: 'https://EFCD6C924B0CADA4EF47D2E578265EFC.gr7.us-east-1.eks.amazonaws.com') {
                    sh "kubectl get pods -l version=${verifyEnv} -n ${KUBE_NAMESPACE}"
                    sh "kubectl get svc backend-svc -n ${KUBE_NAMESPACE}"
                    sh "kubectl get svc frontend-svc -n ${KUBE_NAMESPACE}"
                    }
                }
            }
        }
    }
}



















    }


   






















}