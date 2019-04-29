import { RolePrivilegeEnum } from 'app/data/models';
import { AuthenticationService } from 'app/data/services';
import { Routes } from '@angular/router';

import { BlankComponent, FullComponent } from '@app/shared';

export const AppRoutes: Routes = [
  {
    path: '',
    canActivateChild: [AuthenticationService],
    component: FullComponent,
    children: [
      {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadChildren: './dashboard/dashboard.module#DashboardModule',
        data: {
          requiresAuthentication: true
        }
      }
    ]
  },
  {
    path: '',
    component: BlankComponent,
    children: [
      {
        path: '',
        loadChildren:
          './views/authentication/authentication.module#AuthenticationModule'
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/404'
  }
];
