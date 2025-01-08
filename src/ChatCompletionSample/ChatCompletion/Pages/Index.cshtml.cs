using ChatCompletion.Lib.Model;
using ChatCompletion.Lib.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace ChatCompletion.Pages;

public class IndexModel : PageModel
{
    private readonly IMemoryService memoryService;

    private readonly IList<IChatCompletionConnector> chatCompletionConnectors;

    public string Id { get; set; } = default!;

    public IEnumerable<MemoryModel> Chats { get; private set; } = default!;

    public MemoryModel Chat { get; private set; } = default!;

    public IndexModel(GCSMemoryService memoryService, IEnumerable<IChatCompletionConnector> chatCompletionConnectors)
    {
        this.memoryService = memoryService;
        this.chatCompletionConnectors = chatCompletionConnectors.ToList();

    }
    public async Task<ActionResult> OnGetAsync(string? id)
    {
        // 引数無し、もしくは不正なIDの場合、ランダムなIDでリダイレクト(新規扱い)
        if (id == null || !id.All(char.IsAsciiLetterOrDigit))
        {
            var threadId = DateTime.Now.ToString("yyMMddHHmmss") + Random.Shared.Next().ToString("x");
            return Redirect(Url.Action("Index", new RouteValueDictionary() { { "id", threadId } })!);
        }
        Id = id;
        Chats = (await memoryService.ListAsync()
            .Take(10)
            .ToListAsync())
            .OrderByDescending(chat => chat.ThreadId);
        Chat = (await memoryService.GetAsync(id)) ?? new()
        {
            ThreadId = id
        };
        if (!Chats.Any(chat => chat.ThreadId == id))
        {
            Chats = Chats.Prepend(Chat);
        }
        return Page();
    }

    public IList<SelectListItem> GetModelsSelectListItem()
    {
        return chatCompletionConnectors.SelectMany(service => service.AvailableModels())
            .Select(model =>
            {
                var str = model.ToString();
                return new SelectListItem(str, str, Chat.Model == str);
            })
            .ToList();
    }

}
