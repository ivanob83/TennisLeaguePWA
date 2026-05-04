import FtpDeploy from 'ftp-deploy'

const ftpDeploy = new FtpDeploy()

await ftpDeploy.deploy({
  user: process.env.FTP_USER,
  password: process.env.FTP_PASS,
  host: process.env.FTP_HOST,
  port: 21,
  localRoot: './dist',
  remoteRoot: process.env.FTP_PATH || '/public_html/',
  include: ['**/*'],
  exclude: [],
  deleteRemote: false,
  forcePasv: true,
})

console.log('Deploy finished.')
