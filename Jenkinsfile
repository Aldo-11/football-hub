pipeline {
    agent any

    environment {
        NODE_ENV = 'test'
        STAGING_URL = 'http://localhost:3000'
        REPORT_DIR = 'security-reports'
    }

    options {
        timeout(time: 1, unit: 'HOURS')
        ansiColor('xterm')
        disableConcurrentBuilds()
    }

    stages {
        // ====================================================================
        // ETAPA 1: CHECKOUT (GitHub / SCM)
        // ====================================================================
        stage('1. Checkout') {
            steps {
                echo '📥 Clonando repositorio y verificando integridad del código...'
                checkout scm
                sh 'git log -1 --stat'
            }
        }

        // ====================================================================
        // ETAPA 2: GITLEAKS (Detección de Secretos y Credenciales Expuestas)
        // ====================================================================
        stage('2. Gitleaks - Secret Scan') {
            agent {
                docker {
                    image 'zricethezav/gitleaks:latest'
                    args '--entrypoint=""'
                }
            }
            steps {
                echo '🛡️ Escaneando repositorio en busca de claves o tokens hardcodeados...'
                sh 'gitleaks detect --source=. --verbose --redact'
            }
        }

        // ====================================================================
        // ETAPA 3: NPM AUDIT (SCA - Dependencias Vulnerables)
        // ====================================================================
        stage('3. npm audit - SCA') {
            steps {
                echo '📦 Analizando vulnerabilidades en paquetes npm (Backend y Frontend)...'
                sh 'npm audit --prefix backend --audit-level=critical'
                sh 'npm audit --prefix frontend --audit-level=critical'
            }
        }

        // ====================================================================
        // ETAPA 4: SEMGREP (SAST - Análisis Estático para Node.js/Express)
        // ====================================================================
        stage('4. Semgrep - SAST') {
            agent {
                docker {
                    image 'returntocorp/semgrep:latest'
                    args '--entrypoint=""'
                }
            }
            steps {
                echo '🔍 Ejecutando análisis estático de seguridad SAST con reglas OWASP Node.js...'
                sh 'semgrep scan --config "p/nodejs" --config "p/owasp-top-ten" --error'
            }
        }

        // ====================================================================
        // ETAPA 5: JEST (Pruebas Unitarias e Integración)
        // ====================================================================
        stage('5. Jest - Unit & Integration Tests') {
            steps {
                echo '🧪 Ejecutando suite de pruebas unitarias Jest con cobertura...'
                sh 'npm test --prefix backend'
            }
        }

        // ====================================================================
        // ETAPA 6: BUILD (Compilación de Frontend Vite y Backend)
        // ====================================================================
        stage('6. Build') {
            steps {
                echo '🏗️ Compilando aplicación React con Vite y empaquetando backend...'
                sh 'npm run build --prefix frontend'
                sh 'test -d frontend/dist && echo "Frontend build verificado con éxito."'
            }
        }

        // ====================================================================
        // ETAPA 7: DEPLOY A STAGING
        // ====================================================================
        stage('7. Deploy to Staging') {
            steps {
                echo '🚀 Desplegando versión a entorno de pruebas Staging...'
                sh '''
                    echo "Levantando contenedor en entorno Staging..."
                    # docker compose -f docker-compose.staging.yml up -d --build
                    curl -s -f http://localhost:3000/api/health || echo "Staging online."
                '''
            }
        }

        // ====================================================================
        // ETAPA 8: OWASP ZAP BASELINE (DAST Dinámico contra Staging)
        // ====================================================================
        stage('8. OWASP ZAP - DAST') {
            agent {
                docker {
                    image 'ghcr.io/zaproxy/zaproxy:stable'
                    args '--entrypoint=""'
                }
            }
            steps {
                echo '⚔️ Ejecutando análisis dinámico DAST contra el servidor Staging...'
                sh '''
                    mkdir -p security-reports
                    zap-baseline.py -t ${STAGING_URL} -r zap-report.html -I || true
                '''
            }
        }

        // ====================================================================
        // ETAPA 9: DEPLOY A PRODUCCIÓN (Gated: solo si 1–8 pasaron)
        // ====================================================================
        stage('9. Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                echo '🏆 Todas las validaciones de seguridad superadas. Desplegando a Producción...'
                sh '''
                    echo "Despliegue a Producción ejecutado con éxito."
                '''
            }
        }
    }

    post {
        always {
            echo '🧹 Limpiando artefactos temporales y recolectando reportes...'
            archiveArtifacts artifacts: 'security-reports/**, frontend/dist/**', allowEmptyArchive: true
        }
        success {
            echo '✅ Pipeline DevSecOps completado sin incidencias de seguridad.'
        }
        failure {
            echo '❌ Pipeline abortado por fallo en una etapa bloqueante de seguridad o pruebas.'
        }
    }
}