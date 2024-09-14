import type {
  FaasDataInjection,
  FaasDataWrapperProps,
  FaasReactClientInstance,
  useFaasOptions,
} from './types'
import type { FaasAction, FaasData, FaasParams } from '@faasjs/types'
import type { BaseUrl, Options, Response, ResponseError } from '@faasjs/browser'
import { FaasBrowserClient } from '@faasjs/browser'
import { FaasDataWrapper } from './FaasDataWrapper'
import { useFaas } from './useFaas'
import { faas } from './faas'

const clients: {
  [key: string]: FaasReactClientInstance
} = {}

export type OnError = (
  action: string,
  params: Record<string, any>
) => (res: ResponseError) => Promise<void>

export type FaasReactClientOptions = {
  /** @default `/` */
  baseUrl?: BaseUrl
  options?: Options
  onError?: OnError
}

/**
 * Before use faas, you should initialize a FaasReactClient.
 *
 * @param props.baseUrl {string} The baseUrl of your faas server
 * @param props.options {Options} The options of client
 * @returns {FaasReactClientInstance}
 *
 * @example
 * ```ts
 * const client = FaasReactClient({
 *   baseUrl: 'localhost:8080/api/'
 * })
 * ```
 */
export function FaasReactClient(
  { baseUrl, options, onError }: FaasReactClientOptions = {
    baseUrl: '/',
  }
): FaasReactClientInstance {
  const client = new FaasBrowserClient(baseUrl, options)

  const reactClient = {
    id: client.id,
    faas: async <PathOrData extends FaasAction>(
      action: PathOrData | string,
      params: FaasParams<PathOrData>,
      options?: Options
    ): Promise<Response<FaasData<PathOrData>>> => faas(action, params, options),
    useFaas: <PathOrData extends FaasAction>(
      action: PathOrData | string,
      defaultParams: FaasParams<PathOrData>,
      options?: useFaasOptions<PathOrData>
    ): FaasDataInjection<FaasData<PathOrData>> =>
      useFaas(action, defaultParams, options),
    FaasDataWrapper: <PathOrData extends FaasAction>(
      props: FaasDataWrapperProps<PathOrData>
    ) => <FaasDataWrapper baseUrl={baseUrl} {...props} />,
    onError,
    browserClient: client,
  }

  clients[baseUrl] = reactClient

  return reactClient
}

/**
 * Get FaasReactClient instance
 *
 * @param host {string} empty string for default host
 * @returns {FaasReactClientInstance}
 *
 * @example
 * ```ts
 * getClient()
 * // or
 * getClient('another-host')
 * ```
 */
export function getClient(host?: string): FaasReactClientInstance {
  const client = clients[host || Object.keys(clients)[0]]

  if (!client) {
    console.warn('FaasReactClient is not initialized manually, use default.')

    return FaasReactClient()
  }

  return client
}
