using MechanicShop.Application.Common.Interfaces;

using Microsoft.EntityFrameworkCore.Storage;

namespace MechanicShop.Infrastructure.Data;

internal sealed class AppTransaction(IDbContextTransaction transaction) : IAppTransaction
{
    private readonly IDbContextTransaction _transaction = transaction;
    private bool _committed;

    public async Task CommitAsync(CancellationToken cancellationToken)
    {
        await _transaction.CommitAsync(cancellationToken);
        _committed = true;
    }

    public async ValueTask DisposeAsync()
    {
        if (!_committed)
        {
            await _transaction.RollbackAsync();
        }

        await _transaction.DisposeAsync();
    }
}
