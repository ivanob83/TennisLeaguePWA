/**
 * Cascade-deletes a competition and all its subcollections:
 * enrollments, groups, rounds (with nested matches), and finally the competition document.
 *
 * Firestore does not auto-delete subcollections, so we do it client-side.
 */
import {
  leaguesRepository,
  tournamentsRepository,
  leagueEnrollmentRepository,
  tournamentEnrollmentRepository,
  leagueGroupsRepository,
  tournamentGroupsRepository,
  roundsRepository,
  matchesRepository,
} from '../../../infrastructure/firestore.js'

async function deleteCollection(repo) {
  const docs = await repo.getAll()
  await Promise.all(docs.map(d => repo.delete(d.id)))
}

export async function deleteCompetition(competitionId, competitionType) {
  const competitionRepo = competitionType === 'leagues' ? leaguesRepository : tournamentsRepository
  const enrollmentRepo = competitionType === 'leagues'
    ? leagueEnrollmentRepository(competitionId)
    : tournamentEnrollmentRepository(competitionId)
  const groupsRepo = competitionType === 'leagues'
    ? leagueGroupsRepository(competitionId)
    : tournamentGroupsRepository(competitionId)
  const rRepo = roundsRepository(competitionType, competitionId)

  // Delete all matches nested under each round
  const rounds = await rRepo.getAll()
  await Promise.all(
    rounds.map(round => {
      const mRepo = matchesRepository(competitionType, competitionId, round.id)
      return deleteCollection(mRepo)
    })
  )

  // Delete rounds, groups, enrollments, then the competition itself
  await deleteCollection(rRepo)
  await deleteCollection(groupsRepo)
  await deleteCollection(enrollmentRepo)
  await competitionRepo.delete(competitionId)
}
