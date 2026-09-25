import { useState } from 'react'
import AppLayout from '../../../layouts/AppLayout.jsx'
import { Container, SectionTitle, Card, Button } from '../../../ui/index.js'
import { repairRoundRobinMatches } from '../../enrollment/services/expandRoundRobin.js'

const LEAGUE_ID = 'trVUL2E5Ul5N2jxYMIVT'

export default function AdminRepairMatchIdsPage() {
  const [status, setStatus] = useState('idle')
  const [preview, setPreview] = useState(null)
  const [log, setLog] = useState([])

  function addLog(msg) {
    setLog((prev) => [...prev, msg])
  }

  async function handlePreview() {
    setStatus('previewing')
    setPreview(null)
    setLog([])
    try {
      const result = await repairRoundRobinMatches(LEAGUE_ID, { dryRun: true })
      setPreview(result)
      addLog(`playersPerGroup: ${result.playersPerGroup}`)
      addLog(`Expected per group: ${result.expectedPerGroup} mečeva`)
      for (const g of result.perGroup) {
        if (!g.roundFound) {
          addLog(`  ${g.name}: ⚠ runda nije nađena`)
        } else {
          const issues = []
          if (g.missing > 0) issues.push(`${g.missing} nedostajućih mečeva`)
          if ((g.idsSynced ?? 0) > 0) issues.push(`${g.idsSynced} null player ID-eva za sinhronizaciju`)
          addLog(
            `  ${g.name}: ${issues.length === 0 ? '✓ OK' : issues.join(', ')}`,
          )
        }
      }
      setStatus('previewed')
    } catch (err) {
      addLog(`Greška: ${err.message}`)
      setStatus('error')
    }
  }

  async function handleRepair() {
    setStatus('repairing')
    setLog([])
    try {
      const result = await repairRoundRobinMatches(LEAGUE_ID, { dryRun: false })
      addLog(`✓ Popravka završena`)
      addLog(`  Kreirani mečevi: ${result.matchesCreated}`)
      for (const g of result.perGroup) {
        const parts = []
        if (g.matchesCreated > 0) parts.push(`${g.matchesCreated} kreiranih`)
        if ((g.idsSynced ?? 0) > 0) parts.push(`${g.idsSynced} ID-eva sinhronizovano`)
        if (parts.length > 0) addLog(`  ${g.name}: ${parts.join(', ')}`)
        else addLog(`  ${g.name}: ✓ nije trebalo ništa`)
      }
      setStatus('done')
    } catch (err) {
      addLog(`Greška: ${err.message}`)
      setStatus('error')
    }
  }

  const hasIssues =
    preview &&
    preview.perGroup.some(
      (g) => !g.roundFound || g.missing > 0 || (g.idsSynced ?? 0) > 0,
    )

  return (
    <AppLayout>
      <Container className="py-8">
        <SectionTitle
          title="Repair: Sinhronizuj Player ID-eve"
          subtitle={`Liga ID: ${LEAGUE_ID}`}
        />
        <div className="mt-8 max-w-lg">
          <Card>
            <div className="text-sm text-text-light mb-4 space-y-1">
              <p>
                Popravlja match dokumente gde je <code>player1Id</code> ili{' '}
                <code>player2Id</code> null, a <code>group.playerIds</code> ima igrača za tu
                poziciju.
              </p>
              <p>
                Koristiti kada je igrač naknadno dodat u grupu (expand) ali mečevi prikazuju
                &ldquo;BYE&rdquo; umesto pravog igrača.
              </p>
              <p className="text-amber-600 font-medium pt-1">
                Bezbedan: ne menja ni briše postojeće ID-eve — samo popunjava nullove.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handlePreview}
                loading={status === 'previewing'}
                loadingLabel="Provera..."
                disabled={status === 'previewing' || status === 'repairing'}
              >
                Proveri (dry-run)
              </Button>
              {status === 'previewed' && hasIssues && (
                <Button
                  onClick={handleRepair}
                  loading={status === 'repairing'}
                  loadingLabel="Popravka..."
                >
                  Popravi
                </Button>
              )}
              {status === 'previewed' && !hasIssues && (
                <span className="self-center text-sm text-green-600 font-medium">
                  ✓ Sve je u redu
                </span>
              )}
            </div>

            {log.length > 0 && (
              <pre className="mt-4 rounded bg-slate-50 border border-slate-200 p-3 text-xs text-text-light whitespace-pre-wrap font-mono">
                {log.join('\n')}
              </pre>
            )}
          </Card>
        </div>
      </Container>
    </AppLayout>
  )
}
