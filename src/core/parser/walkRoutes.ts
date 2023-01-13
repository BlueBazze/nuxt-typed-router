import { NuxtRouteConfig } from '@nuxt/types/config/router';
import { camelCase } from 'lodash-es';
import { GeneratorOutput, ParamDecl } from '../../types';
import { isItemLast } from '../../utils';
import { extractRouteParamsFromPath } from './extractParams';
import { extractMatchingSiblings, extractUnMatchingSiblings } from './extractChunks';

type WalkThoughRoutesParams = {
  route: NuxtRouteConfig;
  level: number;
  siblings?: NuxtRouteConfig[];
  parentName?: string;
  previousParams?: ParamDecl[];
  output: GeneratorOutput;
  isLast: boolean;
};

/** Mutates the output object with generated routes */
export function walkThoughRoutes({
  route,
  level,
  siblings,
  parentName,
  previousParams,
  output,
  isLast,
}: WalkThoughRoutesParams) {
  //
  const matchingSiblings = extractMatchingSiblings(route, siblings);
  const haveMatchingSiblings = !!matchingSiblings?.length && route.path !== '/';
  const chunkArray = route.file?.split('/') ?? [];
  const lastChunkArray = chunkArray[chunkArray?.length - 1].split('.vue')[0];
  const isRootSibling = lastChunkArray === 'index';
  if (
    (route.children?.length && !haveMatchingSiblings) ||
    (!route.children?.length && haveMatchingSiblings && isRootSibling)
  ) {
    let childrenChunks = haveMatchingSiblings ? matchingSiblings : route.children;
    const splittedPaths = route.path.split('/');
    const parentPath = splittedPaths[splittedPaths.length - 1];
    const nameKey = camelCase(parentPath || 'index');

    // Output
    output.routesObjectTemplate += `${nameKey}:{`;
    output.routesDeclTemplate += `"${nameKey}":{`;

    // Recursive walk though children

    const allRouteParams = extractRouteParamsFromPath(route.path, false, previousParams);
    childrenChunks?.map((routeConfig, index) =>
      walkThoughRoutes({
        route: routeConfig,
        level: level + 1,
        siblings: extractUnMatchingSiblings(route, siblings),
        parentName: nameKey,
        previousParams: allRouteParams,
        output,
        isLast: isItemLast(childrenChunks, index),
      })
    );
    // Output
    output.routesObjectTemplate += '},';
    output.routesDeclTemplate += `}${isLast ? '' : ','}`;
  } else if (route.name) {
    let splitted: string[] = [];
    splitted = route.name.split('-');
    splitted = splitted.slice(level, splitted.length);
    if (splitted[0] === parentName) {
      splitted.splice(0, 1);
    }

    const keyName = route.path === '' ? 'index' : camelCase(splitted.join('-')) || 'index';

    // Output
    output.routesObjectTemplate += `'${keyName}': '${route.name}' as const,`;
    output.routesDeclTemplate += `"${keyName}": "${route.name}"${isLast ? '' : ','}`;
    output.routesList.push(route.name);
    const isIndexFileForRouting = route.path === '';
    const allRouteParams = extractRouteParamsFromPath(
      route.path,
      isIndexFileForRouting,
      previousParams
    );
    output.routesParams.push({
      name: route.name,
      params: allRouteParams,
    });
  }
}