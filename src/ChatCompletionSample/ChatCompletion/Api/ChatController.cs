using ChatCompletion.Lib.Extensions;
using ChatCompletion.Lib.Model;
using ChatCompletion.Lib.Services;
using ChatCompletion.Plugins;
using Microsoft.AspNetCore.Mvc;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using System.Diagnostics;

namespace ChatCompletion.Api;

[AutoValidateAntiforgeryToken]
[ApiController]
[Route("api/[controller]/[action]")]
[Produces("application/json")]
public class ChatController : ControllerBase
{
    private readonly IMemoryService memoryService;

    private readonly IList<IChatCompletionConnector> chatCompletionConnectors;

    public ChatController(GCSMemoryService memoryService, IEnumerable<IChatCompletionConnector> chatCompletionConnectors)
    {
        this.memoryService = memoryService;
        this.chatCompletionConnectors = chatCompletionConnectors.ToList();
    }

    /// <summary>
    /// AIとチャットを行う
    /// </summary>
    /// <param name="chatMessages"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ActionResult<MemoryModel>> TextOnlyCompletion([FromBody] MemoryModel chatMessages)
    {
        var (usingModel, chatCompletion) = DetectUsingModel(chatMessages);
        var kernel = chatCompletion.CreateKernel(usingModel.ModelName);
        var chatCompletionService = kernel.GetRequiredService<IChatCompletionService>();
        var setting = chatCompletion.GetPromptExecutionSettings();
        Exception? exception = null;
        for (var i = 0; i < 3; i++)
        {
            var history = chatMessages.ToChatHistory();
            try
            {
                var completions = new ChatHistory();
                Stopwatch stopwatch = new();
                stopwatch.Start();
                // FinishReason == stop になるまで繰り返す
                while (!completions.Any(m => "stop" == m?.Metadata?["FinishReason"]?.ToString()?.ToLower()))
                {
                    var completion = await chatCompletionService.GetChatMessageContentsAsync(history, setting);
                    history.AddRange(completion);
                    completions.AddRange(completion);
                }
                stopwatch.Stop();
                int mills = (int)stopwatch.Elapsed.TotalMilliseconds;

                chatMessages.Messages.Add(new()
                {
                    Model = usingModel.ToString(),
                    Id = "assistant-" + Math.Abs(Random.Shared.Next()).ToString(),
                    Version = Math.Abs(Random.Shared.Next()),
                    Type = MemoryModel.MessageType.Assistant,
                    Message = string.Join("", completions.Select(m => m.Content ?? "")),
                    ResponseTimeMills = mills
                });
                return chatMessages;
            }
            catch (Exception ex)
            {
                exception = ex;
            }
            await Task.Delay(TimeSpan.FromSeconds(1));
        }
        return Problem(exception!.ToString());
    }

    /// <summary>
    /// 要約してタイトルを考えてもらう
    /// </summary>
    /// <param name="chatMessages"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ActionResult<IList<string?>>> GenerateTitle([FromBody] MemoryModel chatMessages)
    {
        var (usingModel, chatCompletion) = DetectUsingModel(chatMessages);
        var kernel = chatCompletion.CreateKernel(usingModel.ModelName);

        kernel.Plugins.AddFromType<GenerateTitlePlugin>();
        var chat = kernel.GetRequiredService<IChatCompletionService>();
        Exception? exception = null;
        for (var i = 0; i < 3; i++)
        {
            var history = chatMessages.ToChatHistory();
            history.AddUserMessage("このやり取りからタイトルとして適切な2-5単語の簡潔な説明を1つだけ書いてください");
            try
            {
                var completion = await chat.GetChatMessageContentsAsync(history, new PromptExecutionSettings()
                {
                    FunctionChoiceBehavior = FunctionChoiceBehavior.Auto()
                }, kernel);
                history.AddRange(completion);
                var title = history.LastOrDefault(p => p.Role == AuthorRole.Tool)?.Content?.Trim();
                var content = completion[completion.Count - 1].Content?.Trim() ?? "";
                return new List<string?>([title, content[..Math.Min(20, content.Length)]]);
            }
            catch (Exception ex)
            {
                exception = ex;
            }
            await Task.Delay(TimeSpan.FromSeconds(1));
        }
        return Problem(exception!.ToString());
    }

    /// <summary>
    /// やり取りの一覧
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ActionResult<IList<MemoryModel>>> GetAllChatHeaders()
    {
        return await memoryService.ListAsync().ToListAsync();
    }

    /// <summary>
    /// 今までのやり取りを取得します。
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<MemoryModel>> ResumeTextOnlyChat(string id)
    {
        if (string.IsNullOrWhiteSpace(id) || !id.All(char.IsAsciiLetterOrDigit))
        {
            throw new ArgumentNullException(nameof(id));
        }
        var memory = await memoryService.GetAsync(id) ?? new()
        {
            ThreadId = id
        };
        return memory;
    }

    /// <summary>
    /// 今までのやり取りを保存します。
    /// </summary>
    /// <param name="id"></param>
    /// <param name="messages"></param>
    /// <returns></returns>
    [HttpPost("{id}")]
    public async Task<ActionResult<MemoryModel>> SaveTextOnlyChat(string id, [FromBody] MemoryModel model)
    {
        if (string.IsNullOrWhiteSpace(id) || !id.All(char.IsAsciiLetterOrDigit))
        {
            throw new ArgumentNullException(nameof(id));
        }
        await memoryService.WriteAsync(model);
        return model;
    }

    /// <summary>
    /// チャットを削除します
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    /// <exception cref="ArgumentNullException"></exception>
    [HttpPost("{id}")]
    public ActionResult DeleteTextOnlyChat(string id)
    {
        if (string.IsNullOrWhiteSpace(id) || !id.All(char.IsAsciiLetterOrDigit))
        {
            throw new ArgumentNullException(nameof(id));
        }
        memoryService.Delete(id);
        return new EmptyResult();
    }

    private (ModelString model, IChatCompletionConnector chatCompletion) DetectUsingModel(MemoryModel chatMessages)
    {
        foreach (var chatCompletion in chatCompletionConnectors)
        {
            var modelString = chatCompletion.AvailableModels().FirstOrDefault(model => model.ToString() == chatMessages.Model);
            if (modelString != null)
            {
                return (modelString, chatCompletion);
            }
        }
        var defaultChatCompletion = chatCompletionConnectors.First();
        return (defaultChatCompletion.AvailableModels().First(), defaultChatCompletion);
    }
}
