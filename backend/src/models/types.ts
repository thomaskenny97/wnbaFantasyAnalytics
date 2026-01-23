export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  conference: "East" | "West";
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: "G" | "F" | "C" | "G/F" | "F/C";
  teamId: string;
  jerseyNumber?: number;
}
