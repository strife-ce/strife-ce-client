import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { NotFoundComponent } from '@app/views/authentication/404/not-found.component';
import { AuthenticationRoutes } from '@app/views/authentication/authentication.routing';
import { LoginComponent } from '@app/views/authentication/login/login.component';
import { SignupComponent } from '@app/views/authentication/signup/signup.component';
import { SharedModule } from '@app/shared';

@NgModule({
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    NgbModule,
    SharedModule,
    RouterModule.forChild(AuthenticationRoutes)
  ],
  declarations: [NotFoundComponent, SignupComponent, LoginComponent]
})
export class AuthenticationModule {}
