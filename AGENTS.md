<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application rules
- Family screens use the form-only data service; never fetch scores, roadmaps, plans or payments, to prevent clinical results reaching families.
- Admin form reads and exports verify the authenticated administrador role server-side before reading registered accounts; pagination must include the complete dataset.
- Preserve retired public URLs as redirects and retired external endpoints as HTTP 410; retain all existing tables and data.
- Completion and per-module progress derive from saved question IDs, not report or payment state; preserve the question catalog and scale options.
