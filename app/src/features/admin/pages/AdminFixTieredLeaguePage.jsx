import { useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../infrastructure/firebase.js'
import { createCompetitionSlots } from '../../enrollment/services/competitionSlots.js'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Card, Button } from '../../../ui/index.js'

const LEAGUE_ID = 'trVUL2E5Ul5N2jxYMIVT'

const CONFIG = {
  format: 'round_robin',
  numGroups: 3,
  playersPerGroup: 8,
  tierMultipliers: [1, 0.75, 0.5],
  promotionCount: 2,
  relegationCount: 2,
  pointsPerWin: 3,
  pointsPerLoss: 0,
}

export default function AdminFixTieredLeaguePage() {
  const [status, setStatus] = useState('idle')
  const [log, setLog] = useState([])

  function addLog(msg) {
    setLog((prev) => [...prev, msg])
  }

  async function handleFix() {
    setStatus('loading')
    setLog([])
    try {
      const leagueRef = doc(db, 'leagues', LEAGUE_ID)
      const leagueSnap = await getDoc(leagueRef)
      if (!leagueSnap.exists()) throw new Error('Liga nije pronađena')
      addLog(`Liga: "${leagueSnap.data().name}"`)

      addLog('Ažuriram liga dokument...')
      await updateDoc(leagueRef, {
        numGroups: CONFIG.numGroups,
        playersPerGroup: CONFIG.playersPerGroup,
        tierMultipliers: CONFIG.tierMultipliers,
        promotionCount: CONFIG.promotionCount,
        relegationCount: CONFIG.relegationCount,
        pointsPerWin: CONFIG.pointsPerWin,
        pointsPerLoss: CONFIG.pointsPerLoss,
        updatedAt: new Date(),
      })
      addLog('✓ Liga ažurirana (numGroups=3, playersPerGroup=8, tierMultipliers=[1,0.75,0.5])')

      addLog('Kreiram grupe, runde i match slotove...')
      addLog('  → 3 grupe × 28 mečeva = 84 match slota (biće malo)')
      await createCompetitionSlots(CONFIG, LEAGUE_ID, 'leagues')
      addLog('✓ Grupe A, B, C kreirane')
      addLog('✓ 3 round-robin runde kreirane')
      addLog('✓ 84 match slota generisana')

      setStatus('done')
      addLog('--- Gotovo! Idi na Draw tab da dodaš igrače. ---')
    } catch (err) {
      addLog(`Greška: ${err.message}`)
      setStatus('error')
    }
  }

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle title="Fix: Kreiraj Grupe" subtitle={`Liga ID: ${LEAGUE_ID}`} />
        <div className="mt-8 max-w-lg">
          <Card>
            <div className="text-sm text-text-light mb-4 space-y-1">
              <p>Kreira grupe, runde i match slotove za:</p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>3 grupe po 8 igrača (24 slota, 22 igrača + 2 prazna)</li>
                <li>Grupa A: 1.0×, Grupa B: 0.75×, Grupa C: 0.5×</li>
                <li>Promotion: top 2, Relegation: bottom 2</li>
                <li>Points: 3/0 (win/loss)</li>
              </ul>
              <p className="pt-1 text-amber-600 font-medium">
                ⚠ Pokretati samo jednom — ne briše postojeće podatke pre kreiranja.
              </p>
            </div>
            <Button onClick={handleFix} disabled={status === 'loading' || status === 'done'}>
              {status === 'loading'
                ? 'Kreiranje...'
                : status === 'done'
                  ? '✓ Gotovo'
                  : 'Kreiraj Grupe i Match Slotove'}
            </Button>
            {log.length > 0 && (
              <div className="mt-4 font-mono text-xs space-y-1 bg-slate-50 rounded-md p-3 border border-slate-200">
                {log.map((line, i) => (
                  <div
                    key={i}
                    className={line.startsWith('Greška') ? 'text-red-600' : 'text-slate-700'}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Container>
    </AppLayout>
  )
}
