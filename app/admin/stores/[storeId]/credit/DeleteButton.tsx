'use client';

export function DeleteButton({ transactionId }: { transactionId: string }) {
  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/credit-transactions/${transactionId}/delete`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="text-red-600 hover:underline text-xs"
    >
      Delete
    </button>
  );
}
