import * as $ from 'jquery';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule, Injector } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';
import { APP_INITIALIZER } from '@angular/core';

import { NgToggleModule } from '@nth-cloud/ng-toggle';

import { AppRoutes } from '@app/app.routing';
import { AppComponent } from '@app/app.component';
import { SharedModule } from '@app/shared';
import {
  AuthenticationService,
  ErrorService,
  ParseService
} from 'app/data/services';
import { UserService, RoleService } from 'app/data/modelservices';

@NgModule({
  declarations: [AppComponent],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    NgbModule.forRoot(),
    RouterModule.forRoot(AppRoutes),
    SharedModule,
    ToastrModule.forRoot(),
    NgToggleModule
  ],
  bootstrap: [AppComponent],
  providers: [
    AuthenticationService,
    {
      provide: APP_INITIALIZER,
      useFactory: AppModule.onAppInit,
      multi: true,
      deps: [Injector]
    },
    ErrorService,
    ParseService,
    RoleService
  ]
})
export class AppModule {
  private static onAppInit(injector: Injector) {
    return () => {
      const href = window.location.href;
      if (href.indexOf('localhost') < 0) {
        localStorage.removeItem('SESSION');
      } else {
        localStorage.setItem('SESSION', "notwindowsnotwindowsnotwindowsno");
      }

      if (href.indexOf('session') >= 0) {
        const session = href.substr(href.indexOf('session=') + 'session='.length);
        localStorage.setItem('SESSION', session);
      }
      return new Promise<void>((resolve, reject) => {

        injector
          .get(AuthenticationService)
          .initialize()
          .then(() => resolve());
      });
    };
  }
}
