using MechanicShop.Application.Common.Interfaces;
using MechanicShop.Application.Features.Identity.Dtos;
using MechanicShop.Domain.Common.Results;

using MediatR;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MechanicShop.Application.Features.Identity.Queries.GetUserInfo;

public class GetUserByIdQueryHanlder(
    ILogger<GetUserByIdQueryHanlder> logger,
    IIdentityService identityService,
    IAppDbContext context)
    : IRequestHandler<GetUserByIdQuery, Result<AppUserDto>>
{
    private readonly ILogger<GetUserByIdQueryHanlder> _logger = logger;
    private readonly IIdentityService _identityService = identityService;
    private readonly IAppDbContext _context = context;

    public async Task<Result<AppUserDto>> Handle(GetUserByIdQuery request, CancellationToken ct)
    {
        var getUserByIdResult = await _identityService.GetUserByIdAsync(request.UserId!);

        if (getUserByIdResult.IsError)
        {
            _logger.LogWarning(
                "User {UserId} lookup failed: {ErrorDescription}",
                request.UserId,
                getUserByIdResult.TopError.Description);

            return getUserByIdResult.Errors;
        }

        var user = getUserByIdResult.Value;

        if (!Guid.TryParse(user.UserId, out var employeeId))
        {
            return user;
        }

        var employee = await _context.Employees
            .AsNoTracking()
            .Where(e => e.Id == employeeId)
            .Select(e => new
            {
                e.FirstName,
                e.LastName,
                e.Role
            })
            .FirstOrDefaultAsync(ct);

        if (employee is null)
        {
            return user;
        }

        var fullName = $"{employee.FirstName} {employee.LastName}".Trim();

        return user with
        {
            FirstName = employee.FirstName,
            LastName = employee.LastName,
            Name = string.IsNullOrWhiteSpace(fullName) ? user.Email : fullName,
            Role = employee.Role.ToString()
        };
    }
}
