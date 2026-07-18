import { defineConfig } from 'tsdown';
import jsr from './jsr.json' with { type: 'json' };

export default defineConfig({
  entry: Object.values(jsr.exports),
});
