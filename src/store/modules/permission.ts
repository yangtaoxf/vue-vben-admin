import { REDIRECT_ROUTE } from '/@/router/constant';
import type { AppRouteRecordRaw, Menu } from '/@/router/types';
import store from '/@/store/index';
import { hotModuleUnregisterModule } from '/@/utils/helper/vuexHelper';

import { VuexModule, Mutation, Module, getModule, Action } from 'vuex-module-decorators';

import { PermissionModeEnum } from '/@/enums/appEnum';

import { appStore } from '/@/store/modules/app';
import { userStore } from '/@/store/modules/user';

import { asyncRoutes } from '/@/router/routes/index';
import { filter } from '/@/utils/helper/treeHelper';
import { toRaw } from 'vue';
import { getMenuListById } from '/@/api/sys/menu';

import { genRouteModule, transformObjToRoute } from '/@/utils/helper/routeHelper';
import { transformRouteToMenu } from '/@/utils/helper/menuHelper';

import { useMessage } from '/@/hooks/web/useMessage';
import { warn } from '/@/utils/log';

const { createMessage } = useMessage();
const NAME = 'permission';
hotModuleUnregisterModule(NAME);
@Module({ dynamic: true, namespaced: true, store, name: NAME })
class Permission extends VuexModule {
  // private routesState: AppRouteRecordRaw[] = [];

  // 权限编码列表
  private permCodeListState: string[] = [];

  // Whether the route has been dynamically added
  private isDynamicAddedRouteState = false;

  private lastBuildMenuTimeState = 0;

  private backMenuListState: Menu[] = [];

  get getPermCodeListState() {
    return this.permCodeListState;
  }

  get getBackMenuListState() {
    return this.backMenuListState;
  }

  get getLastBuildMenuTimeState() {
    return this.lastBuildMenuTimeState;
  }

  // get getRoutesState() {
  //   return this.routesState;
  // }

  get getIsDynamicAddedRouteState() {
    return this.isDynamicAddedRouteState;
  }

  @Mutation
  commitPermCodeListState(codeList: string[]): void {
    this.permCodeListState = codeList;
  }

  @Mutation
  commitBackMenuListState(list: Menu[]): void {
    this.backMenuListState = list;
  }

  @Mutation
  commitLastBuildMenuTimeState(): void {
    this.lastBuildMenuTimeState = new Date().getTime();
  }

  // @Mutation
  // commitRoutesState(routes: AppRouteRecordRaw[]): void {
  //   this.routesState = routes;
  // }

  @Mutation
  commitDynamicAddedRouteState(added: boolean): void {
    this.isDynamicAddedRouteState = added;
  }

  @Mutation
  commitResetState(): void {
    this.isDynamicAddedRouteState = false;
    this.permCodeListState = [];
    this.backMenuListState = [];
    this.lastBuildMenuTimeState = 0;
  }

  @Action
  async buildRoutesAction(id?: number | string): Promise<AppRouteRecordRaw[]> {
    let routes: AppRouteRecordRaw[] = [];
    const roleList = toRaw(userStore.getRoleListState);

    const { permissionMode } = appStore.getProjectConfig;

    // role permissions
    if (permissionMode === PermissionModeEnum.ROLE) {
      routes = filter(asyncRoutes, (route) => {
        const { meta } = route;
        const { roles } = meta!;
        if (!roles) return true;
        return roleList.some((role) => roles.includes(role));
      });
      // this.commitRoutesState(routes);
      // Background permissions
      warn(
        `当前权限模式为:${PermissionModeEnum.ROLE},请将src/store/modules/permission.ts内的后台菜单获取函数注释,如果已注释可以忽略此信息!`
      );
      //  如果确定不需要做后台动态权限,请将下面整个判断注释
    } else if (permissionMode === PermissionModeEnum.BACK) {
      const messageKey = 'loadMenu';
      createMessage.loading({
        content: '菜单加载中...',
        key: messageKey,
        duration: 1,
      });
      // 这里获取后台路由菜单逻辑自行修改
      const paramId = id || userStore.getUserInfoState.userId;
      if (!paramId) {
        throw new Error('paramId is undefined!');
      }
      let routeList: any[] = await getMenuListById({ id: paramId });
      // 动态引入组件
      routeList = transformObjToRoute(routeList);
      //  后台路由转菜单结构
      const backMenuList = transformRouteToMenu(routeList);
      this.commitBackMenuListState(backMenuList);
      // 生成路由
      routes = genRouteModule(routeList) as AppRouteRecordRaw[];
      routes.push(REDIRECT_ROUTE);
    }
    return routes;
  }
}
export { Permission };
export const permissionStore = getModule<Permission>(Permission);
