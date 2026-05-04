/**
 * Points awarded per competition type and phase.
 * Adjust these values to change the ranking formula.
 *
 * Tournament bonuses are additive on top of group stage points:
 *   - groupWin / groupLoss: awarded per match in round_robin rounds
 *   - semifinal: bonus for losing in the semifinal (3rd/4th place)
 *   - final: bonus for losing in the final (runner-up)
 *   - winner: bonus for winning the final (champion)
 */

export const TOURNAMENT_POINTS = {
  groupWin: 100,
  groupLoss: 20,
  semifinal: 250,
  final: 500,
  winner: 1000,
}

export const LEAGUE_POINTS = {
  groupWin: 100,
  groupLoss: 20,
  semifinal: 250,
  final: 500,
  winner: 1000,
}
