import {IsString, IsOptional, IsNumber, Min, Max, MaxLength, IsInt, IsIn} from 'class-validator';
import type {ChatTurn} from '../ai.workflow';

export class LoginDto {@IsString() @MaxLength(200) email!:string; @IsString() @MaxLength(200) password!:string;}
export class ForecastDto {@IsString() targetDay!:string;}
export class ScenarioDto {
  @IsString() @MaxLength(100) title!:string;
  @IsString() targetDay!:string;
  @IsInt() @Min(0) @Max(100000) baselineDemand!:number;
  @IsNumber() @Min(-100) @Max(300) growthPercent!:number;
}
export class CapacityLabDto {
  @IsInt() @Min(0) @Max(100000) baselineDemand!:number;
  @IsNumber() @Min(-100) @Max(300) growthPercent!:number;
  @IsInt() @Min(50) @Max(100) targetUtilizationPercent!:number;
  @IsOptional() @IsInt() @Min(1) @Max(40) availableDoctors?:number;
  @IsOptional() @IsInt() @Min(1) @Max(40) rooms?:number;
  @IsOptional() @IsInt() @Min(1) @Max(200) visitsPerDoctor?:number;
  @IsOptional() @IsInt() @Min(0) @Max(100000000) extraDoctorCost?:number;
}
export class DecisionDto {
  @IsString() scenarioId!:string;
  @IsIn(['APPROVED','REJECTED']) action!:'APPROVED'|'REJECTED';
  @IsOptional() @IsInt() @Min(1) alternativeDoctors?:number;
  @IsString() @MaxLength(500) rationale!:string;
}
export class InsightDto {@IsOptional() @IsString() @MaxLength(400) question?:string;}
export class AiConverseDto {@IsString() @MaxLength(600) question!:string; @IsOptional() history?:ChatTurn[];}
