import { LockKeyhole, Paperclip } from 'lucide-react'

import type { Campaign, WorkspaceState } from '../lib/domain/types'

function TicketField({ label, value }: { label: string; value: string }) {
  return <><dt>{label}</dt><dd>{value}</dd></>
}

export function CampaignJobTicket({ campaign, version }: { campaign: Campaign; version: WorkspaceState['version'] }) {
  return (
    <aside className="job-ticket" aria-label="Campaign job ticket">
      <div className="ticket-topline"><span>Campaign job ticket</span><span className="ticket-id">#SB-2024-017</span></div>
      <section className="ticket-title" aria-labelledby="campaign-name">
        <h1 id="campaign-name">{campaign.name}</h1>
        <p>The air remembers.</p>
      </section>
      <dl className="ticket-facts">
        <TicketField label="Client" value="Iterum" />
        <TicketField label="Brand" value="Iterum" />
        <TicketField label="Campaign" value={campaign.name} />
        <TicketField label="Art director" value="Iterum studio" />
        <TicketField label="Producer" value="Iterum studio" />
      </dl>
      <section className="ticket-copy" aria-labelledby="ticket-notes">
        <h2 id="ticket-notes">Notes / direction</h2>
        <p>ozone<br />crushed iris<br />mineral rain<br />warm concrete<br />skin</p>
      </section>
      <section className="ticket-copy" aria-labelledby="ticket-deliverables">
        <h2 id="ticket-deliverables">Deliverables</h2>
        <ul>{campaign.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="ticket-copy ticket-constraints" aria-labelledby="ticket-constraints">
        <h2 id="ticket-constraints">Anti-directions</h2>
        <ul>{campaign.constraints.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="version-history" aria-labelledby="version-history">
        <h2 id="version-history">Versions</h2>
        <ol>
          <li><b>V01</b><span>May 16</span><em>Initial concept</em></li>
          <li><b>V02</b><span>May 18</span><em>Type + image</em></li>
          <li><b>V{String(version).padStart(2, '0')}</b><span>May 20</span><em>Agent review</em></li>
        </ol>
      </section>
      <section className="attachments" aria-labelledby="attachments-title">
        <h2 id="attachments-title">Attachments (3)</h2>
        <ul><li><Paperclip aria-hidden="true" />STATIC_BLOOM_BRIEF.pdf</li><li><Paperclip aria-hidden="true" />STATIC_BLOOM_COPY.txt</li><li><Paperclip aria-hidden="true" />MOOD_NOTES.vrt</li></ul>
      </section>
      <footer className="ticket-footer"><span><LockKeyhole aria-hidden="true" />Ticket locked</span><button type="button">Edit locked fields</button></footer>
    </aside>
  )
}
