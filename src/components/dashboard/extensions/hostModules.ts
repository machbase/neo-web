import { applicationHostModules } from '@/extensions/host/applicationModules';
import { settingsModule } from './hostModules/settings';
import { messagesModule } from './hostModules/messages';
import { panelsModule } from './hostModules/panels';
import { headerModule } from './hostModules/header';

export const dashboardHostModules = {
    settings: settingsModule,
    messages: messagesModule,
    panels: panelsModule,
    header: headerModule,
    ...applicationHostModules,
};
