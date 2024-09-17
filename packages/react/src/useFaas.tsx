import type { FaasAction, FaasData, FaasParams } from '@faasjs/types'
import { useState, useRef } from 'react'
import type { BaseUrl, Response } from '@faasjs/browser'
import { getClient } from './client'
import type { FaasDataInjection } from './FaasDataWrapper'
import { useEqualEffect, equal, useEqualCallback } from './equal'

export type useFaasOptions<PathOrData extends FaasAction> = {
  params?: FaasParams<PathOrData>
  data?: FaasData<PathOrData>
  setData?: React.Dispatch<React.SetStateAction<FaasData<PathOrData>>>
  /**
   * If skip is true, the request will not be sent.
   *
   * However, you can still use reload to send the request.
   */
  skip?: boolean | ((params: FaasParams<PathOrData>) => boolean)
  /** Send the last request after milliseconds */
  debounce?: number
  baseUrl?: BaseUrl
}

/**
 * Request faas server with React hook
 *
 * @param action {string} action name
 * @param defaultParams {object} initial action params
 * @returns {FaasDataInjection<any>}
 *
 * @example
 * ```tsx
 * function Post ({ id }) {
 *   const { data } = useFaas<{ title: string }>('post/get', { id })
 *   return <h1>{data.title}</h1>
 * }
 * ```
 */
export function useFaas<PathOrData extends FaasAction>(
  action: PathOrData | string,
  defaultParams: FaasParams<PathOrData>,
  options: useFaasOptions<PathOrData> = {}
): FaasDataInjection<PathOrData> {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<FaasData<PathOrData>>()
  const [error, setError] = useState<any>()
  const [params, setParams] = useState(defaultParams)
  const [reloadTimes, setReloadTimes] = useState(0)
  const [fails, setFails] = useState(0)
  const [skip, setSkip] = useState(
    typeof options.skip === 'function'
      ? options.skip(defaultParams)
      : options.skip
  )
  const promiseRef = useRef<Promise<Response<FaasData<PathOrData>>>>()
  const controllerRef = useRef<AbortController | null>(null)

  useEqualEffect(() => {
    setSkip(
      typeof options.skip === 'function' ? options.skip(params) : options.skip
    )
  }, [typeof options.skip === 'function' ? params : options.skip])

  useEqualEffect(() => {
    if (!equal(defaultParams, params)) {
      setParams(defaultParams)
    }
  }, [defaultParams])

  useEqualEffect(() => {
    if (!action || skip) {
      setLoading(false)
      return
    }

    setLoading(true)

    controllerRef.current = new AbortController()

    const client = getClient(options.baseUrl)

    function send() {
      const request = client.faas<PathOrData>(
        action,
        options.params || params,
        { signal: controllerRef.current.signal }
      )
      promiseRef.current = request

      request
        .then(r => {
          options.setData ? options.setData(r.data) : setData(r.data)
          setLoading(false)
        })
        .catch(async e => {
          if (
            typeof e?.message === 'string' &&
            (e.message as string).toLowerCase().indexOf('aborted') >= 0
          )
            return

          if (
            !fails &&
            typeof e?.message === 'string' &&
            e.message.indexOf('Failed to fetch') >= 0
          ) {
            console.warn(`FaasReactClient: ${e.message} retry...`)
            setFails(1)
            return send()
          }

          if (client.onError)
            try {
              await client.onError(action as string, params)(e)
            } catch (error) {
              setError(error)
            }
          else setError(e)
          setLoading(false)
          return Promise.reject(e)
        })
    }

    if (options.debounce) {
      const timeout = setTimeout(send, options.debounce)

      return () => {
        clearTimeout(timeout)
        controllerRef.current?.abort()
        setLoading(false)
      }
    }

    send()

    return () => {
      controllerRef.current?.abort()
      setLoading(false)
    }
  }, [action, options.params || params, reloadTimes, skip])

  const reload = useEqualCallback(
    (params?: FaasParams<PathOrData>) => {
      if (skip) setSkip(false)
      if (params) setParams(params)

      setReloadTimes(prev => prev + 1)

      return promiseRef.current
    },
    [params, skip]
  )

  return {
    action,
    params,
    loading,
    data: options.data || data,
    reloadTimes,
    error,
    promise: promiseRef.current,
    reload,
    setData: options.setData || setData,
    setLoading,
    setPromise: newPromise =>
      typeof newPromise === 'function'
        ? newPromise(promiseRef.current)
        : (promiseRef.current = newPromise),
    setError,
  }
}

useFaas.whyDidYouRender = true
