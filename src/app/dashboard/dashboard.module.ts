import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { DashboardRoutes } from '@app/dashboard/dashboard.routing';
import { DashboardComponent } from '@app/dashboard/dashboard/dashboard.component';
import { NgToggleModule } from '@nth-cloud/ng-toggle';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { AccountService, UserService, GlobalPlayerService, ItemService } from '@app/data/modelservices';
import { AdsenseModule } from 'ng2-adsense';
import { ModerationComponent } from './moderation/moderation.component';
import { CraftingComponent } from '@app/dashboard/crafting/crafting.component';

@NgModule({
  imports: [
    FormsModule,
    CommonModule,
    NgbModule,
    NgToggleModule,
    RouterModule.forChild(DashboardRoutes),
    NgCircleProgressModule.forRoot(),
    AdsenseModule.forRoot({
      adClient: 'ca-pub-8248851277942593',
      adSlot: 5670932491,
    })

  ],
  declarations: [DashboardComponent, ModerationComponent, CraftingComponent],
  providers: [
    AccountService,
    UserService,
    ItemService,
    GlobalPlayerService
  ]
})
export class DashboardModule { }
