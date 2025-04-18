import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import {
  type Server as HttpServer,
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from 'node:http'
import type { Socket } from 'node:net'
import { join, resolve as pathResolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { types } from 'node:util'
import { createBrotliCompress, createDeflate, createGzip } from 'node:zlib'
import { deepMerge } from '@faasjs/deep_merge'
import type { Func } from '@faasjs/func'
import { HttpError } from '@faasjs/http'
import { loadConfig, loadPackage } from '@faasjs/load'
import { Logger, getTransport } from '@faasjs/logger'

type Cache = {
  file?: string
  handler?: (...args: any) => Promise<any>
}

type Mounted = {
  pending: [IncomingMessage, ServerResponse<IncomingMessage>, number][]
}

const servers: Server[] = []

export function getAll(): Server[] {
  return servers
}

export async function closeAll(): Promise<void> {
  for (const server of servers) await server.close()
}

const AdditionalHeaders = [
  'content-type',
  'authorization',
  'x-faasjs-request-id',
  'x-faasjs-timing-pending',
  'x-faasjs-timing-processing',
  'x-faasjs-timing-total',
]

/**
 * Options for configuring the server.
 */
export type ServerOptions = {
  /**
   * The port on which the server will listen.
   * @default 3000
   */
  port?: number

  /**
   * Callback function that is called when the server starts.
   *
   * Note: It will not break the server if an error occurs.
   *
   * @param context - The context object containing the logger.
   * @example
   * ```ts
   * const server = new Server(process.cwd(), {
   *   onStart: async ({ logger }) => {
   *     logger.info('Server started')
   *   })
   * })
   * ```
   */
  onStart?: (context: { logger: Logger }) => Promise<void>

  /**
   * Callback function that is called when an error occurs.
   * @param error - The error that occurred.
   * @param context - The context object containing the logger.
   * @example
   * ```ts
   * const server = new Server(process.cwd(), {
   *   onError: async (error, { logger }) => {
   *     logger.error(error)
   *   })
   * })
   * ```
   */
  onError?: (error: Error, context: { logger: Logger }) => Promise<void>

  /**
   * Callback function that is called when the server is closed.
   * @param context - The context object containing the logger.
   * @example
   * ```ts
   * const server = new Server(process.cwd(), {
   *   onClose: async ({ logger }) => {
   *     logger.info('Server closed')
   *   })
   * })
   * ```
   */
  onClose?: (context: { logger: Logger }) => Promise<void>
}

export function getRouteFiles(root: string, path: string): string[] {
  const deeps = path.replace(root, '').split('/').length
  const parents = path.replace(root, '').split('/').filter(Boolean)
  const searchPaths = [
    `${path}.func.ts`,
    `${path}.func.tsx`,
    `${path}/index.func.ts`,
    `${path}/index.func.tsx`,
    `${path}/default.func.ts`,
    `${path}/default.func.tsx`,
  ].concat(
    ...Array(deeps)
      .fill(0)
      .flatMap((_, i) => {
        const folder = root + parents.slice(0, -(i + 1)).join('/')

        return [
          join(folder, 'default.func.ts'),
          join(folder, 'default.func.tsx'),
        ]
      })
  )

  return searchPaths
}

/**
 * FaasJS Server.
 *
 * @param {string} root The root path of the server.
 * @param {ServerOptions} opts The options of the server.
 * @returns {Server}
 * @example
 * ```ts
 * import { Server } from '@faasjs/server'
 *
 * const server = new Server(process.cwd(), {
 *   port: 8080,
 * })
 *
 * server.listen()
 * ```
 */
export class Server {
  public readonly root: string
  public readonly logger: Logger
  public readonly options: ServerOptions

  protected closed = false

  private activeRequests = 0
  private cachedFuncs: {
    [path: string]: Cache
  } = {}

  private onError: (error: any) => void

  private server: HttpServer
  private sockets: Set<Socket> = new Set()

  constructor(root: string, opts?: ServerOptions) {
    if (!process.env.FaasEnv && process.env.NODE_ENV === 'development')
      process.env.FaasEnv = 'development'

    this.root = root.endsWith(sep) ? root : root + sep
    this.options = deepMerge(
      {
        port: 3000,
      },
      opts || {}
    )

    if (opts.onClose && !types.isAsyncFunction(opts.onClose))
      throw Error('onClose must be async function')
    if (opts.onError && !types.isAsyncFunction(opts.onError))
      throw Error('onError must be async function')
    if (opts.onStart && !types.isAsyncFunction(opts.onStart))
      throw Error('onStart must be async function')

    if (!process.env.FaasMode) process.env.FaasMode = 'mono'

    process.env.FaasLocal = `http://localhost:${this.options.port}`

    this.logger = new Logger(`server][${randomBytes(16).toString('hex')}`)
    this.logger.debug(
      'FaasJS server initialized: [%s] [%s] %s %j',
      process.env.FaasEnv,
      process.env.FaasMode,
      this.root,
      this.options
    )

    this.onError = (error: any) => {
      if (!(error instanceof Error)) error = Error(error)

      this.logger.error(error)

      if (opts?.onError)
        try {
          opts.onError(error, {
            logger: this.logger,
          })
        } catch (error: any) {
          this.logger.error(error)
        }
    }

    servers.push(this)
  }

  public async processRequest(
    path: string,
    req: IncomingMessage,
    res: ServerResponse & {
      statusCode: number
      write: (body: string | Buffer) => void
      end: () => void
      setHeader: (key: string, value: string) => void
    },
    requestedAt: number
  ): Promise<void> {
    const requestId =
      (req.headers['x-faasjs-request-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      `FS-${randomBytes(16).toString('hex')}`
    const logger = new Logger(requestId)

    logger.info('%s %s', req.method, req.url)

    const startedAt = Date.now()

    return await new Promise(resolve => {
      let body = ''

      req.on('readable', () => {
        body += req.read() || ''
      })

      req.on('end', async () => {
        let headers: {
          [key: string]: string
        } = {
          'Access-Control-Allow-Origin': req.headers.origin || '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'OPTIONS, POST',
          'Access-Control-Expose-Headers': (
            req.headers['access-control-expose-headers'] || ''
          )
            .split(',')
            .filter(Boolean)
            .concat(AdditionalHeaders)
            .join(','),
          'X-FaasJS-Request-Id': requestId,
          'X-FaasJS-Timing-Pending': (startedAt - requestedAt).toString(),
        }

        // get and remove accept-encoding to avoid http module compression
        const encoding = req.headers['accept-encoding'] || ''
        delete req.headers['accept-encoding']

        let data: any
        try {
          let cache: Cache = {}

          if (this.cachedFuncs[path]?.handler) {
            cache = this.cachedFuncs[path]
            logger.debug('response with cached %s', cache.file)
          } else {
            cache.file = pathResolve('.', this.getFilePath(path))
            logger.debug('response with %s', cache.file)

            const func = await loadPackage<Func>(cache.file, [
              'func',
              'default',
            ])

            func.config = loadConfig(
              this.root,
              path,
              process.env.FaasEnv || 'development',
              logger
            )
            if (!func.config) throw Error('No config file found')

            cache.handler = func.export().handler

            this.cachedFuncs[path] = cache
          }

          const url = new URL(req.url, `http://${req.headers.host}`)

          data = await cache.handler(
            {
              headers: req.headers,
              httpMethod: req.method,
              path: url.pathname,
              queryString: Object.fromEntries(new URLSearchParams(url.search)),
              body,
              raw: {
                request: req,
                response: res,
              },
            },
            { request_id: requestId }
          )
        } catch (error: any) {
          logger.error(error)
          data = error
        }

        if (res.writableEnded) return resolve()

        // process headers
        const finishedAt = Date.now()

        if (data.headers) headers = Object.assign(headers, data.headers)

        if (!headers['X-FaasJS-Timing-Processing'])
          headers['X-FaasJS-Timing-Processing'] = (
            finishedAt - startedAt
          ).toString()

        if (!headers['X-FaasJS-Timing-Total'])
          headers['X-FaasJS-Timing-Total'] = (
            finishedAt - requestedAt
          ).toString()

        Object.freeze(headers)

        for (const key in headers) res.setHeader(key, headers[key])

        if (data instanceof Response) {
          res.statusCode = data.status

          const reader = data.body.getReader()

          const stream = Readable.from(
            (async function* () {
              while (true) {
                try {
                  const { done, value } = await reader.read()
                  if (done) break
                  if (value) yield value
                } catch (error: any) {
                  logger.error(error)
                  stream.emit(error)
                  break
                }
              }
            })()
          )

          stream
            .pipe(res)
            .on('finish', () => {
              res.end()
              resolve()
            })
            .on('error', err => {
              this.onError(err)
              if (!res.headersSent) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.write(JSON.stringify({ error: { message: err.message } }))
              }
              resolve()
            })

          return
        }

        let resBody: string | Buffer
        if (
          data instanceof Error ||
          data?.constructor?.name?.includes('Error') ||
          typeof data === 'undefined' ||
          data === null
        ) {
          res.statusCode = data?.statusCode || 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          resBody = JSON.stringify({
            error: { message: data?.message || 'No response' },
          })
        } else {
          if (data.statusCode) res.statusCode = data.statusCode

          if (data.body)
            if (data.isBase64Encoded) resBody = Buffer.from(data.body, 'base64')
            else resBody = data.body
        }

        if (resBody) {
          logger.debug('Response %s %j', res.statusCode, headers)

          if (
            res.statusCode !== 200 ||
            typeof resBody !== 'string' ||
            Buffer.byteLength(resBody) < 600
          ) {
            res.write(resBody)
            res.end()
            resolve()
            return
          }

          const compression = encoding.includes('br')
            ? {
                type: 'br',
                compress: createBrotliCompress(),
              }
            : encoding.includes('gzip')
              ? {
                  type: 'gzip',
                  compress: createGzip(),
                }
              : encoding.includes('deflate')
                ? {
                    type: 'deflate',
                    compress: createDeflate(),
                  }
                : false

          if (compression) {
            res.setHeader('Vary', 'Accept-Encoding')
            res.writeHead(200, { 'Content-Encoding': compression.type })

            Readable.from(resBody)
              .pipe(compression.compress)
              .pipe(res)
              .on('error', (err: any) => {
                if (err) logger.error(err)

                res.end()
                resolve()
              })
              .on('close', () => {
                res.end()
                resolve()
              })
            return
          }

          res.write(resBody)
        }

        res.end()
        resolve()
      })
    })
  }

  /**
   * Start server.
   * @returns {Server}
   */
  public listen(): HttpServer {
    if (this.server) throw Error('Server already running')

    this.logger.info(
      '[%s] Listen http://localhost:%s with',
      process.env.FaasEnv,
      this.options.port,
      this.root
    )

    const mounted: Record<string, Mounted> = {}

    if (this.options.onStart) {
      this.logger.debug('[onStart] begin')
      this.logger.time(`${this.logger.label}onStart`)
      this.options
        .onStart({
          logger: this.logger,
        })
        .catch(this.onError)
        .finally(() =>
          this.logger.timeEnd(`${this.logger.label}onStart`, '[onStart] end')
        )
    }

    this.server = createServer(async (req, res) => {
      this.activeRequests++

      res.on('finish', () => this.activeRequests--)

      // don't lock options request
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': req.headers.origin || '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'OPTIONS, POST',
          'Access-Control-Allow-Headers': Object.keys(req.headers)
            .concat(req.headers['access-control-request-headers'] || [])
            .filter(
              key =>
                !key.startsWith('access-control-') &&
                !['host', 'connection'].includes(key) &&
                !AdditionalHeaders.includes(key)
            )
            .concat(AdditionalHeaders)
            .join(', '),
        })
        res.end()
        return
      }

      const path = join(this.root, req.url).replace(/\?.*/, '')

      if (!mounted[path]) mounted[path] = { pending: [] } as Mounted

      mounted[path].pending.push([req, res, Date.now()])

      const pending = mounted[path].pending
      mounted[path].pending = []
      for (const event of pending)
        await this.processRequest(path, event[0], event[1], event[2])
    })
      .on('connection', socket => {
        this.sockets.add(socket)
        socket.on('close', () => {
          this.sockets.delete(socket)
        })
      })
      .on('error', this.onError)
      .listen(this.options.port, '0.0.0.0')

    process
      .on('uncaughtException', e => {
        this.logger.debug('Uncaught exception')
        this.onError(e)
      })
      .on('unhandledRejection', e => {
        this.logger.debug('Unhandled rejection')
        this.onError(e)
      })
      .on('SIGTERM', async () => {
        this.logger.debug('received SIGTERM')

        if (this.closed) {
          this.logger.debug('already closed')
          return
        }

        await this.close()

        if (!process.env.JEST_WORKER_ID && !process.env.VITEST_POOL_ID)
          process.exit(0)
      })
      .on('SIGINT', async () => {
        this.logger.debug('received SIGINT')

        if (this.closed) {
          this.logger.debug('already closed')
          return
        }

        await this.close()

        if (!process.env.JEST_WORKER_ID && !process.env.VITEST_POOL_ID)
          process.exit(0)
      })

    return this.server
  }

  public async close(): Promise<void> {
    if (this.closed) {
      this.logger.debug('already closed')
      return
    }

    this.logger.debug('closing')
    this.logger.time(`${this.logger.label}close`)

    if (this.activeRequests) {
      await new Promise<void>(resolve => {
        const check = () => {
          if (this.activeRequests === 0) {
            resolve()
            return
          }

          this.logger.debug('waiting for %i requests', this.activeRequests)

          setTimeout(check, 50)
        }
        check()
      })
    }

    for (const socket of this.sockets)
      try {
        socket.destroy()
      } catch (error: any) {
        this.onError(error)
      } finally {
        this.sockets.delete(socket)
      }

    await new Promise<void>(resolve => {
      this.server.close(err => {
        if (err) this.onError(err)

        resolve()
      })
    })

    if (this.options.onClose) {
      this.logger.debug('[onClose] begin')
      this.logger.time(`${this.logger.label}onClose`)
      try {
        await this.options.onClose({
          logger: this.logger,
        })
      } catch (error) {
        this.onError(error)
      }
      this.logger.timeEnd(`${this.logger.label}onClose`, '[onClose] end')
    }

    this.logger.timeEnd(`${this.logger.label}close`, 'closed')

    await getTransport().stop()

    this.closed = true
  }

  private getFilePath(path: string) {
    // Safe check
    if (/^(\.|\|\/)+$/.test(path)) throw Error('Illegal characters')

    const searchPaths = getRouteFiles(this.root, path)

    for (const path of searchPaths) {
      if (existsSync(path)) return path
    }

    const message =
      process.env.FaasEnv === 'production'
        ? 'Not found.'
        : `Not found function file.\nSearch paths:\n${searchPaths
            .map(p => `- ${p}`)
            .join('\n')}`

    this.onError(message)

    throw new HttpError({
      statusCode: 404,
      message,
    })
  }
}
