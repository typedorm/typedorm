import {ConnectionOptions} from './connection-options';
import {Connection} from './connection';

export class ConnectionManager {
  private connections: Map<string, Connection>;

  constructor() {
    this.connections = new Map<string, Connection>();
  }

  get(name = 'default') {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`No such connection with name "${name}" exists`);
    }
    return connection;
  }

  create(options: ConnectionOptions) {
    const {name = 'default'} = options;
    if (this.connections.has(name)) {
      throw new Error(
        `There is already an existing connection with name "${name}".`
      );
    }
    this.connections.set(
      name,
      new Connection(
        options,
        this.clearByName.bind(this) // bind Connection manager ctx
      )
    );

    const createdConnection = this.connections.get(name);
    if (!createdConnection) {
      throw new Error(
        `New connection with name "${name}" was created but could not be found.`
      );
    }
    return createdConnection;
  }

  clear() {
    this.connections = new Map<string, Connection>();
  }

  clearByName(name: string) {
    this.connections.delete(name);
  }
}
