using MechanicShop.Application.Features.Billing.Dtos;
using MechanicShop.Domain.Common.Results;

using MediatR;

namespace MechanicShop.Application.Features.Billing.Queries.GetInvoices;

public sealed record GetInvoicesQuery : IRequest<Result<List<InvoiceDto>>>;
