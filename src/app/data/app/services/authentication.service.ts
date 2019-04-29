import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChild, Router } from '@angular/router';
import { RoleService } from 'app/data/modelservices';
import { User, Role, RolePrivilegeEnum, RoleRestrictionEnum } from 'app/data/models';
import { ParseService, Parse } from 'app/data/common/services/parse.service';

@Injectable()
export class AuthenticationService implements CanActivateChild {

    private mainRole: Role = null;
    private roles = new Set<Role>();
    private privileges = new Set<string>();
    private restrictions = new Set<string>();
    private isSU: boolean;

    constructor(private router: Router, private parseService: ParseService, private roleService: RoleService) {
    }

    public initialize() {
        return new Promise<void>((resolve, reject) => {
            this.roles.clear();
            this.privileges.clear();
            this.restrictions.clear();
            this.isSU = false;
            this.mainRole = null;

            if (this.isAuthenticated()) {
                this.roleService.getUserRoles(this.getAuthenticatedUser()).then((roles) => {
                    this.mainRole = ((roles.length > 0) ? roles[0] : null);
                    for (const role of roles) {
                        this.roles.add(role);
                        if (role.privileges) {
                            for (const privilege of role.privileges) {
                                this.privileges.add(privilege)
                            }
                        }
                        if (role.restrictions) {
                            for (const restriction of role.restrictions) {
                                this.restrictions.add(restriction)
                            }
                        }
                    }
                    this.isSU = this.hasPrivilege(RolePrivilegeEnum.su_any);
                    resolve();
                })
            } else {
                resolve();
            }
        })
    }

    public canActivateChild(route: ActivatedRouteSnapshot): boolean {
        const requiresAuthentication: boolean = !(route.data.requiresAuthentication === false);
        if (requiresAuthentication && !this.isAuthenticated()) {
            this.router.navigate(['/pages/login']);
            return false;
        }
        const requiresPrivilieges = route.data.requiresPrivileges;
        console.log(route)
        if (requiresPrivilieges !== undefined && requiresPrivilieges instanceof Array) {
            for (const requiredPrivilege of requiresPrivilieges) {
                if (!this.hasPrivilege(requiredPrivilege)) {
                    // this.toasterService.pop('error', 'Zugriff verweigert', 'Sie verfügen nicht über die notwendigen Rechte, um diese Inhalte aufzurufen.');
                    this.router.navigate(['/pages/login']);
                    return false;
                }
            }
        }
        return true;
    }

    public login(username: string, password: string) {
        return new Promise<User>((resolve, reject) => {
            Parse.User.logIn(username, password, {
                success: () => {
                    this.initialize().then(() => {
                        if (this.privileges.size === 0) {
                            reject('Sie verfügen nicht über die notwendigen Rechte zur Anmeldung.')
                        } else {
                            resolve(this.getAuthenticatedUser())
                        }
                    });
                },
                error: (_user: User, error: Error) => {
                    reject(error);
                }
            })
        })
    }

    public logout() {
        Parse.User.logOut().then(() => this.initialize());
    }

    public resetPassword(username: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Parse.Cloud.run('resetUserPassword', { email: username }, {
                success: () => {
                    resolve();
                },
                error: (error: Parse.Error) => {
                    reject(error)
                }
            })
        })
    }

    public hasPrivilege(privilege: RolePrivilegeEnum): boolean {
        return this.isSU ? true : this.privileges.has(privilege)
    }

    public hasRestriction(restriction: RoleRestrictionEnum): boolean {
        return this.restrictions.has(restriction);
    }

    public getMainRole(): Role {
        return this.mainRole;
    }

    public getAuthenticatedUser(): User {
        return this.parseService.patchSubclass(Parse.User.current());
    }

    public isAuthenticated(): boolean {
        return this.getAuthenticatedUser() !== null;
    }
}
