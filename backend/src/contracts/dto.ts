import {IsString, IsOptional, IsNumber, Min, Max, MaxLength, IsInt, IsIn, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested, IsObject} from 'class-validator';
import type {ChatTurn} from '../ai.workflow';
import {Type} from 'class-transformer';

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

export class ShiftWindowDto {
  @IsString() @MaxLength(50) name!:string;
  @IsInt() @Min(0) @Max(100000) demand!:number;
  @IsInt() @Min(0) @Max(20) maxDoctors!:number;
  @IsInt() @Min(0) @Max(20) rooms!:number;
  @IsInt() @Min(1) @Max(200) visitsPerDoctor!:number;
}
export class ShiftAllocationDto {
  @IsArray() @ArrayMinSize(3) @ArrayMaxSize(3) @ValidateNested({each:true}) @Type(()=>ShiftWindowDto) shifts!:[ShiftWindowDto,ShiftWindowDto,ShiftWindowDto];
  @IsInt() @Min(0) @Max(60) doctorSlotBudget!:number;
  @IsInt() @Min(0) @Max(60) currentDoctorSlots!:number;
  @IsInt() @Min(0) @Max(100000000) costPerAdditionalSlotVnd!:number;
  @IsInt() @Min(50) @Max(100) targetUtilizationPercent!:number;
}

export class SaveStudyDto {
  @IsString() @MaxLength(100) name!:string;
  @IsIn(['CAPACITY','SHIFT']) kind!:'CAPACITY'|'SHIFT';
  @IsObject() input!:Record<string,unknown>;
}
export class ReviewStudyDto {
  @IsIn(['APPROVED','REJECTED']) action!:'APPROVED'|'REJECTED';
  @IsString() @MaxLength(500) rationale!:string;
}
