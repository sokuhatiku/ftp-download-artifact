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
    resolvedPath: any,
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

    if(downloadOptions.createArtifactFolder){
      resolvedPath = path.join(resolvedPath, name)
      fs.mkdirSync(resolvedPath)
    }

    await new Promise<void>((resolve, reject) => {
      client.get(path.join(this.remotePath, name), (err, stream) => {
        if (err) {
          reject(err)
        } else {
          fs.writeFile(resolvedPath, stream, err => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        }
      })
    })

    client.end()

    return {
      artifactName: name,
      downloadPath: resolvedPath
    } as DownloadResponse
  }

  downloadAllArtifacts(path?: string): Promise<DownloadResponse[]> {
    throw new Error('Method not implemented.')
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
