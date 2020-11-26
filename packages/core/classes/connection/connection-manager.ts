import { ConnectionOptions } from './connection-options';
import { Connection } from './connection';

export class ConnectionManager {
  private connections: Map<string, Connection>;

  constructor() {
    this.connections = new Map<string, Connection>();
  }

  get(name: string = 'default') {
    if (!this.connections.has(name)) {
      throw new Error(`No such connection with name "${name}" exists`);
    }
    return this.connections.get(name);
  }

  create(options: ConnectionOptions) {
    const { name = 'default' } = options;
    if (this.connections.has(name)) {
      throw new Error(
        `There is already an existing connection with name "${name}".`
      );
    }
    this.connections.set(name, new Connection(options));

    return this.connections.get(name);
  }

  clear() {
    this.connections = new Map<string, Connection>();
  }
}
