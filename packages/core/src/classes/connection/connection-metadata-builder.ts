import fg from 'fast-glob';
import path from 'path';
import {EntityTarget} from '@typedorm/common';
import {Connection} from './connection';
import {EntityMetadataBuilder} from './entity-metadata-builder';
import {MetadataManager} from '@typedorm/common';

export class ConnectionMetadataBuilder {
  constructor(private connection: Connection) {}

  buildEntityMetadatas(entities: EntityTarget<any>[] | string) {
    let possibleEntitiesToBuild = [] as Function[];
    if (typeof entities === 'string') {
      possibleEntitiesToBuild = [...this.loadEntitiesFromDirs(entities)];
    } else {
      possibleEntitiesToBuild = [...entities];
    }

    // filter all entities that are not marked with `@Entity` decorator
    const entitiesToBuild = possibleEntitiesToBuild.filter(entity =>
      MetadataManager.metadataStorage.hasKnownEntityByName(entity.name)
    );

    return new EntityMetadataBuilder(this.connection).build(entitiesToBuild);
  }

  private loadEntitiesFromDirs(pathMatchPattern: string) {
    const classesDirectory = path.normalize(pathMatchPattern);
    const allFiles = fg
      .sync(classesDirectory, {
        dot: false,
      })
      .map(file => require(file));
    return this.recursiveLoadModulesFromFiles(allFiles, []);
  }

  private recursiveLoadModulesFromFiles(exported: any, allLoaded: Function[]) {
    if (typeof exported === 'function') {
      allLoaded.push(exported);
    } else if (Array.isArray(exported)) {
      exported.forEach((file: any) =>
        this.recursiveLoadModulesFromFiles(file, allLoaded)
      );
    } else if (typeof exported === 'object' && exported !== null) {
      Object.keys(exported).forEach(key =>
        this.recursiveLoadModulesFromFiles(exported[key], allLoaded)
      );
    }
    return allLoaded;
  }
}
