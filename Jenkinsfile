pipeline {

    agent {
        label 'camguinode'
    }

    stages {
        stage('Checkout SCM') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "refs/heads/${env.BRANCH_NAME}"]],
                    extensions: [[$class: 'LocalBranch']],
                    userRemoteConfigs: scm.userRemoteConfigs,
                    doGenerateSubmoduleConfigurations: false,
                    submoduleCfg: []
                ])
            }
        }

        stage('Install & Unit Tests') {
            options {
                timestamps()
                timeout(time: 30, unit: 'MINUTES')
            }

            steps {
                sh './update.sh'
            }
        }

        stage('Build & publish packages') {
            when {
                branch 'master'
            }

            steps {
                sh 'mv dist/ katgui'
                sh 'fpm -s "dir" -t "deb" --name katgui --version $(kat-get-version.py) --description "The operator interface for SKA-SA" katgui=/var/www'
                archiveArtifacts '*.deb'

                // Trigger downstream publish job
                build job: 'ci.publish-artifacts', parameters: [
                        string(name: 'job_name', value: "${env.JOB_NAME}"),
                        string(name: 'build_number', value: "${env.BUILD_NUMBER}")]
            }
        }
    }
}
