// Pipeline equivalente a .github/workflows/ci.yml para ejecutarse en Jenkins
// (docker-compose.jenkins.yml). Cada etapa es bloqueante: si falla, se detiene.
pipeline {
  agent any

  options {
    timeout(time: 1, unit: 'HOURS')
    disableConcurrentBuilds()
  }

  environment {
    NODE_ENV = 'test'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Secret scan (gitleaks)') {
      steps {
        sh 'docker run --rm -v "$WORKSPACE:/repo" zricethezav/gitleaks:v8.24.3 detect --source=/repo --config=/repo/.gitleaks.toml --redact'
      }
    }

    stage('Install') {
      steps { sh 'npm ci && npm ci --prefix backend && npm ci --prefix frontend' }
    }

    stage('Lint') {
      steps { sh 'npm run lint' }
    }

    stage('Tests (unit + API)') {
      steps { sh 'npm run test:coverage --prefix backend && npm test --prefix frontend' }
    }

    stage('Dependency audit (SCA)') {
      steps { sh 'npm run audit' }
    }

    stage('SAST (Semgrep)') {
      steps {
        sh 'docker run --rm -v "$WORKSPACE:/src" semgrep/semgrep semgrep scan --config p/javascript --config p/nodejs --config p/react --config p/owasp-top-ten --error --metrics=off --exclude node_modules --exclude "**/tests/**" /src'
      }
    }

    stage('Build') {
      steps { sh 'npm run build --prefix frontend && test -f frontend/dist/index.html' }
    }

    stage('E2E + DAST (OWASP ZAP)') {
      steps {
        sh '''
          docker rm -f fh-mongo >/dev/null 2>&1 || true
          docker run -d --name fh-mongo -p 27017:27017 mongo:7
          sleep 5
          MONGO_URI=mongodb://localhost:27017/footballhub_e2e npm run test:e2e --prefix backend

          export NODE_ENV=production PORT=3000 FRONTEND_URL=http://localhost:3000 \
                 MONGO_URI=mongodb://localhost:27017/footballhub_dast \
                 JWT_ACCESS_SECRET=$(openssl rand -hex 32) JWT_REFRESH_SECRET=$(openssl rand -hex 32)
          nohup node backend/server.js > server.log 2>&1 &
          for i in $(seq 1 30); do curl -sf http://localhost:3000/api/health && break; sleep 1; done

          mkdir -p security-reports && chmod 777 security-reports
          docker run --rm --network host -v "$WORKSPACE/security-reports:/zap/wrk" ghcr.io/zaproxy/zaproxy:stable \
            zap-baseline.py -t http://localhost:3000 -r zap-report.html -I
        '''
      }
    }
  }

  post {
    always {
      sh 'pkill -f "node backend/server.js" || true; docker rm -f fh-mongo >/dev/null 2>&1 || true'
      archiveArtifacts artifacts: 'security-reports/**, backend/coverage/**, frontend/dist/**', allowEmptyArchive: true
    }
  }
}
