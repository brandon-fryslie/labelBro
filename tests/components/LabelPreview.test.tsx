import { render, screen, fireEvent, flaskResponse } from '../utils/test-utils';
import { LabelPreview } from '../../src/components/LabelPreview';
import { useLabels } from '../../src/hooks/useLabels';

// The pane as the app drives it: generatePreviews for some text, then whatever LabelPreview renders for the result.
function PreviewFor({ text }: { text: string }) {
  const { generatePreviews } = useLabels();
  return (
    <>
      <button onClick={() => generatePreviews(text)}>preview</button>
      <LabelPreview />
    </>
  );
}

describe('LabelPreview', () => {
  it('shows the server\'s message when the preview fails', async () => {
    vi.mocked(fetch).mockResolvedValue(flaskResponse({ error: 'cairo fell over' }, 500));
    render(<PreviewFor text="abc" />);

    fireEvent.click(screen.getByText('preview'));

    expect(await screen.findByText('Preview failed: cairo fell over')).toBeInTheDocument();
  });

  it('replaces a failure with the previews once one succeeds', async () => {
    const image = 'data:image/png;base64,iVBORw0KGgo=';
    vi.mocked(fetch)
      .mockResolvedValueOnce(flaskResponse({ error: 'cairo fell over' }, 500))
      .mockResolvedValueOnce(flaskResponse({ full_labels: [image], small_labels: [image] }));
    render(<PreviewFor text="abc" />);

    fireEvent.click(screen.getByText('preview'));
    await screen.findByText('Preview failed: cairo fell over');
    fireEvent.click(screen.getByText('preview'));

    expect(await screen.findByText('Label 1')).toBeInTheDocument();
    expect(screen.queryByText(/Preview failed/)).not.toBeInTheDocument();
  });
});
