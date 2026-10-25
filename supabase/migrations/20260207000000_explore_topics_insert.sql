-- Allow authenticated users to insert AI-generated explore rows (persist after search/generate)
create policy "explore_topics_insert_authenticated"
on public.explore_topics for insert
to authenticated
with check (true);
