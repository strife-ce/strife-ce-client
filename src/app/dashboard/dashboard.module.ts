import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { DashboardRoutes } from '@app/dashboard/dashboard.routing';
import { DashboardComponent } from '@app/dashboard/dashboard/dashboard.component';
import { NgToggleModule } from '@nth-cloud/ng-toggle';

@NgModule({
  imports: [
    FormsModule,
    CommonModule,
    NgbModule,
    NgToggleModule,
    RouterModule.forChild(DashboardRoutes)
  ],
  declarations: [DashboardComponent]
})
export class DashboardModule { }
