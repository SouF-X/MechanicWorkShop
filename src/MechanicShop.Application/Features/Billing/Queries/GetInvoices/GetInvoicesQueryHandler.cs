using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Application.Features.Billing.Dtos;
using MechanicShop.Application.Features.Billing.Mappers;
using MechanicShop.Domain.Common.Results;

using MediatR;

using Microsoft.EntityFrameworkCore;

namespace MechanicShop.Application.Features.Billing.Queries.GetInvoices;

public sealed class GetInvoicesQueryHandler(IAppDbContext context)
    : IRequestHandler<GetInvoicesQuery, Result<List<InvoiceDto>>>
{
    public async Task<Result<List<InvoiceDto>>> Handle(GetInvoicesQuery query, CancellationToken ct)
    {
        var invoices = await context.Invoices.AsNoTracking()
            .Include(invoice => invoice.LineItems)
            .Include(invoice => invoice.WorkOrder!)
                .ThenInclude(workOrder => workOrder.Vehicle!)
                    .ThenInclude(vehicle => vehicle.Customer)
            .OrderByDescending(invoice => invoice.IssuedAtUtc)
            .ToListAsync(ct);

        return invoices.ToDtos();
    }
}
