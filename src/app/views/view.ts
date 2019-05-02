import { OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Subscription } from 'app/data/services';
import { Router, ActivatedRoute } from '@angular/router';
import { Injector } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { RolePrivilegeEnum, RoleRestrictionEnum } from 'app/data/models';

export abstract class View implements OnInit, OnDestroy, AfterViewInit {
  public Array = Array;
  public Math = Math;
  public RolePrivilegeEnum = RolePrivilegeEnum;
  public RoleRestrictionEnum = RoleRestrictionEnum;

  private subs = new Set<Subscription>();
  constructor(protected injector: Injector) {

  }

  public ngOnInit() {
  }

  public ngAfterViewInit() {

  }

  public ngOnDestroy() {
    for (const sub of Array.from(this.subs.values())) {
      sub.unsubscribe();
    }
    this.subs.clear();
  }

  public navigate(path: string) {
    this.injector.get(Router).navigate([path], { relativeTo: this.injector.get(ActivatedRoute) });
  }

  public setSessionStorage(key: string, value: any) {
    sessionStorage.setItem(key, value);
  }

  public getSessionStorage<T>(key: string, defaultValue: T): T {
    const value = sessionStorage.getItem(key);
    return ((value) ? value : defaultValue) as T;
  }

  public errorMessage(title: string, message?: string) {
    this.injector.get(ToastrService).error(message, title);
  }

  public successMessage(title: string, message?: string) {
    this.injector.get(ToastrService).success(message, title);
  }

  public alert(message: string) {
    alert(message);
  }

  public getEnumValues(enumType: any): Array<number> {
    return Object.keys(enumType).filter((type) => !isNaN(<any>type) && type !== 'values').map<number>((value, index, array) => Number(value));
  }

  protected addSub(subscription: Subscription) {
    this.subs.add(subscription);
    return subscription;
  }
}
