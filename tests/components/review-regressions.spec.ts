import {it,expect,vi,afterEach} from 'vitest';
import {render,fireEvent,waitFor} from '@testing-library/svelte';
import HavenShell from '../../src/components/HavenShell.svelte';
import WritePanel from '../../src/components/WritePanel.svelte';
import FeedbackModal from '../../src/components/FeedbackModal.svelte';
import {JournalRepository} from '../../src/lib/db/repository';
afterEach(()=>vi.unstubAllGlobals());
it('flushes a dirty draft immediately on unmount and persists empty drafts correctly',async()=>{
 const repo=new JournalRepository('review-draft-close');
 const screen=render(WritePanel,{repository:repo});
 const field=screen.getByLabelText('Nội dung ghi chú / Reflection Body');
 await fireEvent.input(field,{target:{value:'latest unsaved text'}});
 screen.unmount();await waitFor(async()=>expect((await repo.getDraft())?.body).toBe('latest unsaved text'));
 const again=render(WritePanel,{repository:repo});await waitFor(()=>expect((again.getByLabelText('Nội dung ghi chú / Reflection Body') as HTMLTextAreaElement).value).toBe('latest unsaved text'));
 await fireEvent.input(again.getByLabelText('Nội dung ghi chú / Reflection Body'),{target:{value:''}});again.unmount();await waitFor(async()=>expect(await repo.getDraft()).toBeUndefined());
 await repo.close();indexedDB.deleteDatabase(repo.dbName);
});
it('retains the Gate language when entering the Shell',async()=>{
 const screen=render(HavenShell,{initialLang:'vi'});
 await fireEvent.click(screen.getByRole('button',{name:'Chọn ngôn ngữ / Select language'}));
 await fireEvent.click(screen.getByText('English',{exact:true}));
 await fireEvent.click(screen.getByRole('button',{name:/Enter Haven/}));
 await waitFor(()=>expect(screen.getByRole('button',{name:/Reflect & Write/})).toBeDefined());
});
it('shows an error rather than submission success when feedback fails',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({success:false},{status:500})));
 const screen=render(FeedbackModal,{lang:'en',onClose:vi.fn()});
 await fireEvent.click(screen.getByRole('button',{name:/send.*feedback|submit/i}));
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Unable to send'));
 expect(screen.queryByText('Thank you for your feedback!')).toBeNull();
});
