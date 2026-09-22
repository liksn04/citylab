import * as tf from '@tensorflow/tfjs'

/**
 * Q-network persistence (M4.8). Serialize a trained network to portable in-memory
 * artifacts and load it back with bit-identical predictions (prediction parity).
 *
 * Artifacts are `tf.io.ModelArtifacts` (topology + weight specs + weight data), so
 * the app can hold them in memory, JSON-persist them, or write them to IndexedDB
 * (`indexeddb://…`) via tf.io directly. Using in-memory artifacts keeps this
 * node-testable without a browser storage backend.
 */

/** Capture a network's artifacts via an in-memory save handler. */
export async function serializeQNetwork(model: tf.LayersModel): Promise<tf.io.ModelArtifacts> {
  let captured: tf.io.ModelArtifacts | undefined
  await model.save(
    tf.io.withSaveHandler(async (artifacts) => {
      captured = artifacts
      return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } }
    }),
  )
  if (!captured) throw new Error('serializeQNetwork: model.save produced no artifacts')
  return captured
}

/** Rebuild a network from artifacts produced by {@link serializeQNetwork}. */
export async function loadQNetwork(artifacts: tf.io.ModelArtifacts): Promise<tf.LayersModel> {
  return tf.loadLayersModel(tf.io.fromMemory(artifacts))
}
