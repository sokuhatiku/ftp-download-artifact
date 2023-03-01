import fs from 'fs'
import FtpSrv from 'ftp-srv'
import {create} from '../src/ftp-artifact-client'
import path from 'path'
import {DownloadOptions} from '@actions/artifact'

describe('FTP Artifact Client', () => {
  const testRoot = 'test'
  const clientRoot = path.join(testRoot, 'client-root')
  const serverRoot = path.join(testRoot, 'server-root')
  const serverAddr = 'localhost'
  const serverPort = 21
  const run_id = process.env['GITHUB_RUN_ID'] ?? '0'
  let server: FtpSrv

  beforeAll(async () => {
    fs.mkdirSync(clientRoot, {recursive: true})
    fs.mkdirSync(serverRoot, {recursive: true})
    server = new FtpSrv({
      url: `ftp://${serverAddr}:${serverPort}`,
      pasv_url: `ftp://${serverAddr}`,
      pasv_min: 49152,
      pasv_max: 65535,
      anonymous: true
    })

    server.on('login', ({username}, resolve) => {
      console.log('[login]username:', username)
      return resolve({root: serverRoot})
    })

    await server.listen()
  }, 10000)

  afterEach(() => {
    fs.rmSync(clientRoot + '/*', {force: true, recursive: true})
    fs.rmSync(serverRoot + '/*', {force: true, recursive: true})
  })

  afterAll(async () => {
    await server.close()
    fs.rmSync(testRoot, {force: true, recursive: true})
  })

  test('Download Artifact', async () => {
    fs.mkdirSync(path.join(serverRoot, run_id, 'TestArtifact'), {
      recursive: true
    })
    fs.writeFileSync(path.join(serverRoot, run_id, 'TestArtifact/1.txt'), '1')
    fs.writeFileSync(path.join(serverRoot, run_id, 'TestArtifact/2.txt'), '2')
    fs.mkdirSync(path.join(serverRoot, run_id, 'TestArtifact/3'), {
      recursive: true
    })
    fs.writeFileSync(path.join(serverRoot, run_id, 'TestArtifact/3/3.txt'), '3')

    const client = create(serverAddr, serverPort, 'anonymous', 'anonymous')
    const response = await client.downloadArtifact(
      'TestArtifact',
      path.join(clientRoot, 'downloadDir'),
      {
        createArtifactFolder: false
      } as DownloadOptions
    )

    expect(response.artifactName).toBe('TestArtifact')
    expect(response.downloadPath).toBe(path.join(clientRoot, 'downloadDir'))
    expect(fs.existsSync(path.join(clientRoot, 'downloadDir/1.txt'))).toBe(true)
    expect(fs.existsSync(path.join(clientRoot, 'downloadDir/2.txt'))).toBe(true)
    expect(fs.existsSync(path.join(clientRoot, 'downloadDir/3/3.txt'))).toBe(
      true
    )
  })

  test('Download Artifact with createArtifactFolder', async () => {
    fs.mkdirSync(path.join(serverRoot, run_id, 'TestArtifact'), {
      recursive: true
    })
    fs.writeFileSync(path.join(serverRoot, run_id, 'TestArtifact/1.txt'), '1')
    fs.writeFileSync(path.join(serverRoot, run_id, 'TestArtifact/2.txt'), '2')
    fs.mkdirSync(path.join(serverRoot, run_id, 'TestArtifact/3'), {
      recursive: true
    })
    fs.writeFileSync(path.join(serverRoot, run_id, 'TestArtifact/3/3.txt'), '3')

    const client = create(serverAddr, serverPort, 'anonymous', 'anonymous')
    const response = await client.downloadArtifact(
      'TestArtifact',
      path.join(clientRoot, 'downloadDir'),
      {
        createArtifactFolder: true
      } as DownloadOptions
    )

    expect(response.artifactName).toBe('TestArtifact')
    expect(response.downloadPath).toBe(
      path.join(clientRoot, 'downloadDir', 'TestArtifact')
    )
    expect(
      fs.existsSync(path.join(clientRoot, 'downloadDir/TestArtifact/1.txt'))
    ).toBe(true)
    expect(
      fs.existsSync(path.join(clientRoot, 'downloadDir/TestArtifact/2.txt'))
    ).toBe(true)
    expect(
      fs.existsSync(path.join(clientRoot, 'downloadDir/TestArtifact/3/3.txt'))
    ).toBe(true)
  })
})
