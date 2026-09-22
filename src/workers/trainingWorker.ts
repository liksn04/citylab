import { TrainingSession, type TrainingCommand } from './trainingProtocol'

/**
 * Thin dedicated-worker glue (M4.7, D-020). All logic lives in the pure
 * TrainingSession; this file only wires messages to `handle()` and posts the
 * responses back. Cast `self` to the worker global to avoid the DOM/WebWorker
 * `postMessage` signature ambiguity. Not unit-tested (I/O boundary); the protocol
 * is tested via TrainingSession. Wired to the app in a later slice.
 */
const ctx = self as unknown as DedicatedWorkerGlobalScope
const session = new TrainingSession()

ctx.onmessage = (event: MessageEvent<TrainingCommand>) => {
  for (const response of session.handle(event.data)) {
    ctx.postMessage(response)
  }
}
