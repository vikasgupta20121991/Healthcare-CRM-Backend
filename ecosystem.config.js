module.exports = {
  apps: [{
    cwd: 'services/labimagingdentaloptical',
    name: 'healthcare-crm-labimagingdentaloptical',
    script: 'services/labimagingdentaloptical/bin/start',
    restartDelay: 1000,
    instances: 1,
    autorestart: false,
    watch: false,
    max_memory_restart: '200M',
    env: {
      SERVICE_NAME: 'healthcare-crm-labimagingdentaloptical',
      PORT: 8008,
      NODE_ENV: 'development'
    },
    env_production: {
      SERVICE_NAME: 'healthcare-crm-labimagingdentaloptical',
      PORT: 3003,
      NODE_ENV: 'production'
    }
  },
  {
    cwd: 'services/insurance',
    name: 'healthcare-crm-insurance',
    script: 'services/insurance/bin/start',
    restartDelay: 1000,
    instances: 1,
    autorestart: false,
    watch: false,
    max_memory_restart: '200M',
    env: {
      SERVICE_NAME: 'healthcare-crm-insurance',
      PORT: 8003,
      NODE_ENV: 'development'
    },
    env_production: {
      SERVICE_NAME: 'healthcare-crm-insurance',
      PORT: 3002,
      NODE_ENV: 'production'
    }
  },
  {
    cwd: 'services/superadmin',
    name: 'healthcare-crm-superadmin',
    script: 'services/superadmin/bin/start',
    restartDelay: 1000,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      SERVICE_NAME: 'healthcare-crm-superadmin',
      PORT: 8006,
      NODE_ENV: 'development'
    },
    env_production: {
      SERVICE_NAME: 'healthcare-crm-superadmin',
      PORT: 3006,
      NODE_ENV: 'production'
    }
  },
  {
    cwd: 'services/pharmacy',
    name: 'healthcare-crm-pharmacy',
    script: 'services/pharmacy/bin/start',
    restartDelay: 1000,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      SERVICE_NAME: 'healthcare-crm-pharmacy',
      PORT: 8001,
      NODE_ENV: 'development'
    },
    env_production: {
      SERVICE_NAME: 'healthcare-crm-pharmacy',
      PORT: 3005,
      NODE_ENV: 'production'
    }
  },
  {
    cwd: 'services/patient',
    name: 'healthcare-crm-patient',
    script: 'services/patient/bin/start',
    restartDelay: 1000,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      SERVICE_NAME: 'healthcare-crm-patient',
      PORT: 8007,
      NODE_ENV: 'development'
    },
    env_production: {
      SERVICE_NAME: 'healthcare-crm-patient',
      PORT: 3004,
      NODE_ENV: 'production'
    }
    },
    {
    cwd: 'services/hospital',
    name: 'healthcare-crm-hospital',
    script: 'services/hospital/bin/start',
    restartDelay: 1000,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      SERVICE_NAME: 'healthcare-crm-hospital',
      PORT: 8004,
      NODE_ENV: 'development'
    },
    env_production: {
      SERVICE_NAME: 'healthcare-crm-hospital',
      PORT: 3001,
      NODE_ENV: 'production'
    }
    },
  {
    cwd: 'services/gateway',
    name: 'healthcare-crm-gateway',
    script: 'services/gateway/bin/start',
    restartDelay: 1000,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      SERVICE_NAME: 'healthcare-crm-gateway',
      PORT: 8005,
      NODE_ENV: 'development'
    },
    env_production: {
      SERVICE_NAME: 'healthcare-crm-gateway',
      PORT: 3000,
      NODE_ENV: 'production'
    }
  },
]
};