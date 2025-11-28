/**
 * Next.js Instrumentation
 *
 * OpenTelemetry setup for AI SDK monitoring and observability.
 * This file is automatically loaded by Next.js at startup.
 *
 * To enable tracing to external services (Langfuse, Datadog, etc.),
 * set the appropriate environment variables:
 * - OTEL_EXPORTER_OTLP_ENDPOINT: Your OTLP endpoint
 * - OTEL_EXPORTER_OTLP_HEADERS: Auth headers (optional)
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only initialize on Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import to avoid bundling in edge runtime
    const { NodeSDK } = await import('@opentelemetry/sdk-node')
    const { Resource } = await import('@opentelemetry/resources')
    const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = await import(
      '@opentelemetry/semantic-conventions'
    )

    // Only set up OTLP exporter if endpoint is configured
    const exporterEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT

    if (exporterEndpoint) {
      const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')

      const sdk = new NodeSDK({
        resource: new Resource({
          [ATTR_SERVICE_NAME]: 'moodb-ai',
          [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
        }),
        traceExporter: new OTLPTraceExporter({
          url: `${exporterEndpoint}/v1/traces`,
          headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
            ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
            : undefined,
        }),
      })

      sdk.start()

      // Graceful shutdown
      process.on('SIGTERM', () => {
        sdk.shutdown()
          .then(() => console.log('OpenTelemetry SDK shut down'))
          .catch((error) => console.error('Error shutting down OpenTelemetry', error))
          .finally(() => process.exit(0))
      })

      console.log('[OpenTelemetry] Initialized with OTLP exporter')
    } else {
      // No external exporter - just log locally
      console.log('[OpenTelemetry] No OTEL_EXPORTER_OTLP_ENDPOINT configured, using console logging only')
    }
  }
}

/**
 * Optional: Called when an error is caught during rendering
 */
export function onRequestError(err: Error) {
  console.error('[Request Error]', err)
}
