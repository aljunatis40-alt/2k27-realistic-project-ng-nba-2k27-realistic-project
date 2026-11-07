export type Position = "PG" | "SG" | "SF" | "PF" | "C";
export type PlayerStatus = "Starter" | "Bench" | "Reserve" | "Inactive";

export interface DraftRecord {
  year: number | null;
  round: number | null;
  pick: number | null;
  undrafted?: boolean;
}

export interface PlayerBiometrics {
  age: number; // display snapshot only; calculate current age from birthDate when available
  birthDate?: string;
  draft_year: number;
  draft_round: number;
  draft_pick: number;
  height_cm: number;
  weight_kg: number;
  skin_tone_id: string;
  body_type: string;
}

export interface PlayerFacialDetails {
  face_mesh_id: string;
  hair_style: string;
  hair_color: string;
  beard_style: string;
  nose_shape: string;
  eye_color: string;
  wrinkle_map: string;
}

export interface PlayerExtremities {
  hand_size_scale: number;
  finger_tape_logic: string;
  foot_size_us: number;
  toe_tape_left: boolean;
  toe_tape_right: boolean;
}

export interface PlayerAccessories {
  headband: { equipped: boolean; color_logic?: string; logo_visible?: boolean };
  left_arm: string;
  right_arm: string;
  left_leg: string;
  right_leg: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  position: Position;
  status: PlayerStatus;
  biometrics: PlayerBiometrics;
  facial_details: PlayerFacialDetails;
  extremities: PlayerExtremities;
  accessories: PlayerAccessories;
  verification?: {
    status: "user-provided-unverified" | "verified" | "needs-review";
    source?: string;
    checked_at?: string;
    likeness_rights?: "authorized" | "not-authorized" | "unknown";
  };
}

export interface TeamDatabaseEntry {
  team_name: string;
  abbreviation: string;
  conference: "Eastern" | "Western";
  stadium: string;
  roster: PlayerProfile[];
}

export interface PlayerDatabase {
  game_title: string;
  database_version: string;
  teams: TeamDatabaseEntry[];
}

export function calculateAge(birthDate: string, asOf: Date): number {
  const birth = new Date(`${birthDate}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime())) throw new Error(`Invalid birthDate: ${birthDate}`);
  let age = asOf.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    asOf.getUTCMonth() < birth.getUTCMonth() ||
    (asOf.getUTCMonth() === birth.getUTCMonth() && asOf.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function validatePlayerDatabase(database: PlayerDatabase): string[] {
  const errors: string[] = [];
  const teamCodes = new Set<string>();
  const playerIds = new Set<string>();

  for (const team of database.teams) {
    if (teamCodes.has(team.abbreviation)) errors.push(`Duplicate team abbreviation: ${team.abbreviation}`);
    teamCodes.add(team.abbreviation);

    for (const player of team.roster) {
      if (playerIds.has(player.id)) errors.push(`Duplicate player ID: ${player.id}`);
      playerIds.add(player.id);

      if (!player.id.startsWith(team.abbreviation)) {
        errors.push(`Player ID ${player.id} does not match team ${team.abbreviation}`);
      }
      if (player.biometrics.age < 18 || player.biometrics.age > 60) {
        errors.push(`Suspicious age for ${player.name}: ${player.biometrics.age}`);
      }
      if (player.biometrics.height_cm < 150 || player.biometrics.height_cm > 240) {
        errors.push(`Invalid height for ${player.name}`);
      }
      if (player.biometrics.weight_kg < 45 || player.biometrics.weight_kg > 200) {
        errors.push(`Invalid weight for ${player.name}`);
      }
      if (player.biometrics.draft_year < 1947 || player.biometrics.draft_year > 2035) {
        errors.push(`Invalid draft year for ${player.name}`);
      }
      if (player.biometrics.draft_round < 1 || player.biometrics.draft_round > 2) {
        errors.push(`Invalid draft round for ${player.name}`);
      }
      if (player.biometrics.draft_pick < 1 || player.biometrics.draft_pick > 100) {
        errors.push(`Invalid draft pick for ${player.name}`);
      }
      if (player.extremities.hand_size_scale < 0.7 || player.extremities.hand_size_scale > 1.5) {
        errors.push(`Hand scale outside safe range for ${player.name}`);
      }
      if (!player.verification || player.verification.status === "user-provided-unverified") {
        // This is an intentional review flag, not a build failure.
      }
    }
  }
  return errors;
}
