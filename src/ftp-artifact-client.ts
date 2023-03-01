import FTPClient from 'ftp'
import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import {
  ArtifactClient,
  DownloadOptions,
  DownloadResponse,
  UploadOptions,
  UploadResponse
} from '@actions/artifact'

class FTPArtifactClient implements ArtifactClient {
  private host: string
  private port: number
  private username: string
  private password: string
  private remotePath: string

  constructor(
    host: string,
    port: number,
    username: string,
    password: string,
    remotePath?: string
  ) {
    this.host = host
    this.port = port
    this.username = username
    this.password = password
    this.remotePath = remotePath ?? '/'
  }

  uploadArtifact(
    name: string,
    files: string[],
    rootDirectory: string,
    options?: UploadOptions | undefined
  ): Promise<UploadResponse> {
    throw new Error('Method not implemented.')
  }

  async downloadArtifact(
    name: string,
    resolvedPath: string,
    downloadOptions: DownloadOptions
  ): Promise<DownloadResponse> {
    const client = new FTPClient()

    await new Promise<void>((resolve, reject) => {
      client.once('ready', resolve)
      client.once('error', reject)
      client.connect({
        host: this.host,
        port: this.port,
        user: this.username,
        password: this.password
      })
    })

    const serverSideArtifactPath = path.join(
      this.remotePath,
      process.env['GITHUB_RUN_ID'] ?? '0',
      name
    )

    if (downloadOptions.createArtifactFolder) {
      resolvedPath = path.join(resolvedPath, name)
      fs.mkdirSync(resolvedPath)
    }

    const filesToDownload: string[] = []

    await this.listToDownloadFilesRecursive(
      client,
      serverSideArtifactPath,
      filesToDownload
    )

    for (const serverSideFilePath of filesToDownload) {
      await new Promise<void>((resolve, reject) => {
        client.get(serverSideFilePath, (err, downloadStream) => {
          if (err) {
            reject(err)
          }
          const pathInArtifact = path.relative(
            serverSideArtifactPath,
            serverSideFilePath
          )
          const localFilePath = path.join(resolvedPath, pathInArtifact)
          core.info(`Downloading: ${pathInArtifact}`)
          fs.mkdirSync(path.dirname(localFilePath), {recursive: true})
          const writeStream = fs.createWriteStream(localFilePath, {
            autoClose: true
          })
          downloadStream.pipe(writeStream)
          downloadStream.once('error', reject)
          writeStream.once('error', reject)
          writeStream.once('finish', resolve)
        })
      })
    }

    client.end()

    return {
      artifactName: name,
      downloadPath: resolvedPath
    } as DownloadResponse
  }

  downloadAllArtifacts(path?: string): Promise<DownloadResponse[]> {
    throw new Error('Method not implemented.')
  }

  async listToDownloadFilesRecursive(
    client: FTPClient,
    currentDir: string,
    filesToDownload: string[]
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      client.list(currentDir, (err, list) => {
        if (err) {
          reject(err)
        }
        try {
          for (const file of list) {
            if (file.type === 'd') {
              this.listToDownloadFilesRecursive(
                client,
                path.join(currentDir, file.name),
                filesToDownload
              )
            } else {
              filesToDownload.push(path.join(currentDir, file.name))
            }
          }
        } catch (err) {
          reject(err)
        }
        resolve()
      })
    })
  }
}

export function create(
  host: string,
  port: number,
  username: string,
  password: string,
  remotePath?: string
): FTPArtifactClient {
  return new FTPArtifactClient(host, port, username, password, remotePath)
}
