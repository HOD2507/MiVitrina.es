import { IsIn, IsOptional, IsString } from "class-validator";
import { UserRole, VerificationStatus } from "@mivitrina/shared";

const USER_STATUS_FILTERS = ["ALL", "SUSPENDED", ...Object.values(VerificationStatus)] as const;

export class ListUsersQueryDto {
  @IsOptional()
  @IsIn([UserRole.COMMERCANT, UserRole.ANNONCEUR])
  role?: typeof UserRole.COMMERCANT | typeof UserRole.ANNONCEUR;

  /** "SUSPENDED" et "ALL" sont transversaux ; les statuts de vérification ne s'appliquent qu'aux comerçants
   * (ignorés silencieusement pour un annonceur, voir AdminService.listUsers). */
  @IsOptional()
  @IsIn(USER_STATUS_FILTERS)
  status?: (typeof USER_STATUS_FILTERS)[number];

  /** Recherche libre : email, nom du compte, nom du commerce/de la société. */
  @IsOptional()
  @IsString()
  search?: string;
}
