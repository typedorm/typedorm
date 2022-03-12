import fg from 'fast-glob';
import path from 'path';
import {
  DuplicateEntityPhysicalNameError,
  EntityTarget,
  MissingRequiredEntityPhysicalNameError,
} from '@typedorm/common';
import {Connection} from './connection';
import {EntityMetadataBuilder} from './entity-metadata-builder';
import {MetadataManager} from '@typedorm/common';
import {EntityMetadata} from '../metadata/entity-metadata';

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
      MetadataManager.metadataStorage.hasKnownEntity(entity)
    );

    const entityMetadatas = new EntityMetadataBuilder(this.connection).build(
      entitiesToBuild
    );
    this.sanitizeDuplicates(entityMetadatas);

    return entityMetadatas;
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

  private sanitizeDuplicates(metadata: EntityMetadata[]) {
    const cache: string[] = [];
    metadata.forEach(metadata => {
      if (!metadata.name) {
        throw new MissingRequiredEntityPhysicalNameError(metadata.target.name);
      }

      if (cache.includes(metadata.name)) {
        throw new DuplicateEntityPhysicalNameError(metadata.name);
      } else {
        cache.push(metadata.name);
      }
    });
  }
}
