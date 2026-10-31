// Jest environment untuk tes yang bergantung pada zona waktu lokal (WIB).
// `process.env.TZ = ...` di dalam file tes tidak berpengaruh di Jest 30 karena
// `process` di sandbox adalah salinan, jadi TZ diatur di proses worker sebelum sandbox dibuat.
const { TestEnvironment } = require('jest-environment-node');

module.exports = class JakartaEnvironment extends TestEnvironment {
  constructor(config, context) {
    const previous = process.env.TZ;
    process.env.TZ = 'Asia/Jakarta';
    super(config, context);
    this.previousTZ = previous;
  }

  async teardown() {
    if (this.previousTZ === undefined) delete process.env.TZ;
    else process.env.TZ = this.previousTZ;
    await super.teardown();
  }
};
